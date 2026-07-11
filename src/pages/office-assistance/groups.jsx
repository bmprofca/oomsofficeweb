import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FiPlus,
    FiEye,
    FiMoreVertical,
    FiUsers,
    FiCheckCircle,
    FiXCircle,
    FiFolder,
    FiChevronRight
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import getHeaders from "../../utils/get-headers";
import API_BASE_URL from '../../utils/api-controller';
import axios from 'axios';
import { PiExportBold } from "react-icons/pi";


const Groups = () => {
    // Header/Sidebar states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    // Main states
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState([]);
    const [filteredGroups, setFilteredGroups] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);


    // Form states
    const [createForm, setCreateForm] = useState({
        name: '',
        remark: ''
    });
    const [editForm, setEditForm] = useState({
        name: '',
        remark: ''
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
        fetchGroupsData(searchTerm);
    }, []);


    useEffect(() => {
        if (searchTerm.trim()) {
            const timer = setTimeout(() => {
                fetchGroupsData(searchTerm);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [searchTerm]);

    // REAL API - Replace the mock function
    const fetchGroupsData = async (search = '', page = 1, limit = 10) => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
            if (search) params.append('search', search);

            const response = await axios.get(`${API_BASE_URL}/group/list?${params.toString()}`, { headers });

            if (response.data.success) {
                // ✅ PERFECT MAPPING - Matches YOUR API exactly
                const mapGroupToUI = (item) => ({
                    group_id: item.group_id,
                    groupid: item.group_id,
                    name: item.name,
                    count: Number(item.firm_count) || 0,
                    is_active: item.is_active,
                    remark: item.remark || '',
                    created_date: item.create_date ? new Date(item.create_date).toISOString().split('T')[0] : '',
                    createddate: item.create_date ? new Date(item.create_date).toISOString().split('T')[0] : '',
                    updated_date: item.modify_date ? new Date(item.modify_date).toISOString().split('T')[0] : '',
                    updateddate: item.modify_date ? new Date(item.modify_date).toISOString().split('T')[0] : ''
                });

                const mappedGroups = response.data.data.map(mapGroupToUI);
                setGroups(mappedGroups);
                setFilteredGroups(mappedGroups);
            } else {
                setGroups([]);
                setFilteredGroups([]);
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            setGroups([]);
            setFilteredGroups([]);
        } finally {
            setLoading(false);
        }
    };



    // Handle edit form changes
    const handleEditChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    // ✅ FIXED: Store editing group properly
    const [editingGroupId, setEditingGroupId] = useState(null); // ADD THIS STATE

    const handleEdit = (group) => {
        setEditForm({
            name: group.name,
            remark: group.remark || ''
        });
        setEditingGroupId(group.group_id); // ✅ STORE group_id
        setShowEditModal(true);
        setActiveDropdown(null);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editForm.name.trim()) {
            alert('Group name is required');
            return;
        }

        try {
            setLoading(true);
            const headers = getHeaders();

            // ✅ FIXED: Use stored group_id
            if (!editingGroupId) {
                alert('No group selected');
                return;
            }

            await axios.put(
                `${API_BASE_URL}/group/edit`,
                {
                    group_id: editingGroupId,
                    name: editForm.name,
                    remark: editForm.remark
                },
                { headers }
            );

            // Update local state
            const updateGroup = (groups) => groups.map(group =>
                group.group_id === editingGroupId
                    ? { ...group, name: editForm.name, remark: editForm.remark, updated_date: new Date().toISOString().split('T')[0] }
                    : group
            );

            setGroups(updateGroup);
            setFilteredGroups(updateGroup);

            setShowEditModal(false);
            setEditForm({ name: '', remark: '' });
            setEditingGroupId(null); // ✅ Reset
        } catch (error) {
            console.error('Edit error:', error);
            alert('Failed to update group');
        } finally {
            setLoading(false);
        }
    };
    // Delete handlers
    const handleDelete = (group) => {
        setGroupToDelete(group);
        setDeleteModalOpen(true);
        setActiveDropdown(null);
    };

    const handleConfirmDelete = async () => {
        if (!groupToDelete) return;

        try {
            setLoading(true);
            const headers = getHeaders();

            // ✅ UPDATED: Correct endpoint + form data format
            await axios.delete(
                `${API_BASE_URL}/group/delete`,
                {
                    headers,
                    data: {
                        group_id: groupToDelete.group_id
                    }
                }
            );

            // Remove from local state
            setGroups(prev => prev.filter(g => g.group_id !== groupToDelete.group_id));
            setFilteredGroups(prev => prev.filter(g => g.group_id !== groupToDelete.group_id));

            setDeleteModalOpen(false);
            setGroupToDelete(null);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete group');
        } finally {
            setLoading(false);
        }
    };


    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setGroupToDelete(null);
    };

    // Handle create form submit
    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        if (!createForm.name.trim()) {
            alert('Group name is required');
            return;
        }

        try {
            setLoading(true);
            const headers = getHeaders();

            // ✅ REAL CREATE API - ONLY name + remark (as you specified)
            const response = await axios.post(`${API_BASE_URL}/group/create`, {
                name: createForm.name.trim(),
                remark: createForm.remark.trim()
            }, { headers });

            if (response.data.success) {
                // ✅ Use REAL data from API response
                const newGroup = {
                    group_id: response.data.data.group_id,  // Real ID from API
                    name: response.data.data.name,
                    remark: response.data.data.remark || '',
                    count: response.data.data.firm_count || 0,
                    is_active: response.data.data.is_active || true,  // From API
                    created_date: response.data.data.create_date ?
                        new Date(response.data.data.create_date).toISOString().split('T')[0] :
                        new Date().toISOString().split('T')[0],
                    updated_date: response.data.data.modify_date ?
                        new Date(response.data.data.modify_date).toISOString().split('T')[0] :
                        new Date().toISOString().split('T')[0]
                };

                // Add to top of both arrays
                setGroups(prev => [newGroup, ...prev]);
                setFilteredGroups(prev => [newGroup, ...prev]);

                // Reset & close
                setShowCreateModal(false);
                setCreateForm({ name: '', remark: '' });
            }
        } catch (error) {
            console.error('Create error:', error.response?.data || error);
            alert(error.response?.data?.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };


    const handleStatusChange = async (group) => {
        try {
            const newStatus = !group.is_active;  // Toggle boolean

            // Optimistic UI update - update BOTH arrays
            setGroups(prev => prev.map(g =>
                g.group_id === group.group_id ? { ...g, is_active: newStatus } : g
            ));
            setFilteredGroups(prev => prev.map(g =>
                g.group_id === group.group_id ? { ...g, is_active: newStatus } : g
            ));

            // API call using is_active
            const headers = getHeaders();
            await axios.put(`${API_BASE_URL}/group/toggle-status`, {
                group_id: group.group_id,
                is_active: newStatus  // Send boolean
            }, { headers });

        } catch (error) {
            // Revert on error
            setGroups(prev => prev.map(g =>
                g.group_id === group.group_id ? { ...g, is_active: group.is_active } : g
            ));
            setFilteredGroups(prev => prev.map(g =>
                g.group_id === group.group_id ? { ...g, is_active: group.is_active } : g
            ));
            console.error('Toggle failed:', error);
        }
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

    // Export handler - SIMPLIFIED
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '—';  // ✅ Empty → Dash
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-GB');
    };


    // Calculate summary
    const summary = {
        totalGroups: filteredGroups.length || 0,
        activeGroups: filteredGroups.filter(group => group.is_active).length || 0,
        totalFirms: filteredGroups.reduce((sum, group) => sum + (Number(group.count) || 0), 0) || 0,
    };

    // Skeleton Loading Component
    const SkeletonLoader = () => (
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    {/* Header Skeleton */}
                    <div className="mb-6 animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-64"></div>
                    </div>

                    {/* Controls Skeleton */}
                    <div className="flex flex-col lg:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                        <div className="w-48">
                            <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                        <div className="w-32">
                            <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                    </div>

                    {/* Table Skeleton */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm animate-pulse">
                        <div className="border-b border-gray-200">
                            <div className="h-12 bg-gray-100 rounded-t-lg"></div>
                        </div>
                        <div className="p-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-100 rounded mb-2"></div>
                            ))}
                        </div>
                        <div className="border-t border-gray-200">
                            <div className="h-16 bg-gray-100 rounded-b-lg"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Skeleton row for table
    const SkeletonRow = () => (
        <tr className="border-b border-gray-100 animate-pulse">
            <td className="p-4 text-center">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-4">
                <div className="space-y-1.5">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                </div>
            </td>
            <td className="p-4 text-center">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-4 text-center">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-12 mx-auto"></div>
            </td>
            <td className="p-4 text-center">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-8 mx-auto"></div>
            </td>
        </tr>
    );

    // Show skeleton while loading
    if (loading && groups.length === 0) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50">
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
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Header with Stats */}
                        <div className="mb-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                                <div>
                                    <h5 className="text-2xl font-bold text-gray-800 mb-2">
                                        Firm Groups Management
                                    </h5>
                                    <p className="text-gray-600 text-sm">
                                        Organize and manage your client groups efficiently
                                    </p>
                                </div>

                                <motion.button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-600/40"
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Add New Group
                                </motion.button>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Total Groups</p>
                                            <h3 className="text-2xl font-bold text-gray-800">{summary.totalGroups}</h3>
                                        </div>
                                        <div className="p-3 bg-indigo-50 rounded-lg">
                                            <FiFolder className="w-6 h-6 text-indigo-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Active Groups</p>
                                            <h3 className="text-2xl font-bold text-green-600">{summary.activeGroups}</h3>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-lg">
                                            <FiCheckCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Total Firms</p>
                                            <h3 className="text-2xl font-bold text-blue-600">{summary.totalFirms}</h3>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <FiUsers className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Inactive Groups</p>
                                            <h3 className="text-2xl font-bold text-red-600">{summary.totalGroups - summary.activeGroups}</h3>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-lg">
                                            <FiXCircle className="w-6 h-6 text-red-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden">
                            {/* User Groups Header */}
                            <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
                                <div className="header flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div className="options-parent">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-lg">
                                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 className="text-lg font-bold text-slate-800 whitespace-nowrap">
                                                    User Groups
                                                </h5>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-3 w-full justify-end">
                                        {/* Search Input */}
                                        <div className="relative flex justify-center items-center w-full max-w-[500px]">
                                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search user groups..."
                                                className="pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full max-w-[500px]"
                                            />

                                        </div>
                                        <div className="flex gap-2">
                                            {/* Export Dropdown */}
                                            <div className="dropdown-container relative">
                                                <motion.button
                                                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                                                    className="px-4 h-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <PiExportBold className="w-4 h-4" />
                                                    <FiChevronRight className={`w-3 h-3 transition-transform ${showAddDropdown ? 'rotate-90' : ''}`} />

                                                </motion.button>

                                                <AnimatePresence>
                                                    {showAddDropdown && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 5 }}
                                                            className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                        >
                                                            <div className="py-1">
                                                                <button
                                                                    onClick={() => handleExport('pdf')}
                                                                    className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                                >
                                                                    <div className="p-1.5 bg-red-50 rounded mr-2 group-hover:bg-red-100 transition-colors">
                                                                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10l-5.5 5.5m0 0L12 21l5.5-5.5m-5.5 5.5V8a2 2 0 012-2h2.5a2 2 0 012 2v8" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="font-medium text-xs">Export as PDF</div>
                                                                    </div>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleExport('excel')}
                                                                    className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                                >
                                                                    <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                                                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="font-medium text-xs">Export as Excel</div>
                                                                    </div>
                                                                </button>
                                                                <button
                                                                    onClick={() => setWhatsappModalOpen(true)}
                                                                    className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                                >
                                                                    <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                                                        <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                                                            <path fillRule="evenodd" d="M17.428 12.62a5.999 5.999 0 01-4.865 5.854 6.004 6.004 0 01-3.395-.88L8.72 17.8a.74.74 0 01-.28-.53c0-.21.11-.41.29-.53l1.15-1.15a5.32 5.32 0 00-1.585-.92 5.17 5.17 0 01-1.856-.97 4.98 4.98 0 01-1.756-4.01A4.686 4.686 0 016.6 8.38a5.18 5.18 0 017.364 1.48.74.74 0 010 .75l-1.21 2.3a.74.74 0 00.2 1.03l2.46 2.46a.74.74 0 00.52.21c.13 0 .26-.05.36-.15l2.44-2.44a.74.74 0 01.1-.1l2.4 2.4c.09.08.14.19.14.3v.1z" clipRule="evenodd" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="font-medium text-xs">Share via WhatsApp</div>
                                                                    </div>
                                                                </button>
                                                                <button
                                                                    onClick={() => setIsEmailModalOpen(true)}
                                                                    className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                                                                >
                                                                    <div className="p-1.5 bg-blue-50 rounded mr-2 group-hover:bg-blue-100 transition-colors">
                                                                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="font-medium text-xs">Share via Email</div>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <motion.button
                                                onClick={() => setShowCreateModal(true)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Table Container */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Table Header */}
                                <div className="bg-gradient-to-r from-gray-50 to-indigo-50">
                                    <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-gray-200">
                                        <div className="col-span-1">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                #
                                            </div>
                                        </div>
                                        <div className="col-span-5">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Group Details
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Number Of Firms
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Status
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Actions
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Table Body */}
                                <div className="flex-1 overflow-y-auto">
                                    {loading ? (
                                        <div className="p-5">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {Array.from({ length: 8 }).map((_, index) => (
                                                        <SkeletonRow key={index} />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : filteredGroups.length === 0 ? (

                                        <div className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="p-4 bg-gray-100 rounded-full mb-4">
                                                    <FiFolder className="w-12 h-12 text-gray-400" />
                                                </div>
                                                <p className="text-gray-500 text-lg font-medium mb-2">
                                                    {groups.length === 0 ? 'No firm groups available' : 'No matching groups found'}
                                                </p>
                                                <p className="text-gray-400 text-sm mb-4">
                                                    {groups.length === 0
                                                        ? 'Get started by creating your first firm group'
                                                        : 'Try adjusting your search or filter criteria'}
                                                </p>
                                                <motion.button
                                                    onClick={() => setShowCreateModal(true)}
                                                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    Create Your First Group
                                                </motion.button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-5">
                                            {filteredGroups.map((group, index) => {
                                                const isDropdownOpen = activeDropdown === group.group_id;

                                                return (
                                                    <motion.div
                                                        key={group.group_id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="grid grid-cols-12 gap-2 py-3 border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200 group"
                                                    >
                                                        {/* # Column */}
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 font-semibold rounded-lg">
                                                                {index + 1}
                                                            </span>
                                                        </div>

                                                        {/* Group Details Column */}
                                                        <div className="col-span-5 flex flex-col items-center justify-center text-center">
                                                            <div className="mb-2">
                                                                <div className="text-gray-800 font-semibold text-sm mb-1">
                                                                    {group.name}
                                                                </div>
                                                                {group.remark && (
                                                                    <div className="text-gray-500 text-xs max-w-xs">
                                                                        {group.remark}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-gray-500 text-xs">Created {formatDate(group.created_date)}</div>
                                                        </div>

                                                        {/* Number Of Firms Column */}
                                                        <div className="col-span-2 flex items-center justify-center">
                                                            <Link
                                                                to={`/staff/office-assistance/group-firms?group_id=${group.group_id}`}
                                                                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 font-semibold text-sm rounded-lg border border-indigo-200 hover:from-indigo-100 hover:to-blue-100 transition-all min-w-[80px] shadow-sm"
                                                            >
                                                                <FiUsers className="w-3 h-3 mr-1" />
                                                                {group.count}
                                                            </Link>
                                                        </div>



                                                        {/* Status Column */}
                                                        <div className="col-span-2 flex items-center justify-center">
                                                            <button
                                                                className="relative inline-flex items-center cursor-pointer focus:outline-none"
                                                                onClick={() => handleStatusChange(group)}
                                                                role="switch"
                                                                aria-checked={group.is_active}
                                                                aria-labelledby={`group-${group.group_id}-label`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={group.is_active}
                                                                    onChange={() => handleStatusChange(group)} // Add this to fix warning
                                                                    className="sr-only"
                                                                    id={`group-${group.group_id}-switch`}
                                                                />
                                                                <div className={`w-14 h-7 rounded-full transition-colors duration-300 ease-in-out ${group.is_active
                                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                                                    : 'bg-gradient-to-r from-gray-300 to-gray-400'
                                                                    }`}>
                                                                    <div className={`absolute top-0.5 ${group.is_active ? 'left-7' : 'left-0.5'
                                                                        } bg-white rounded-full h-6 w-6 transition-all duration-300 ease-in-out border border-gray-300 shadow-sm`}></div>
                                                                </div>
                                                                {group.is_active ? (
                                                                    <span className="absolute left-1.5 top-1 text-xs text-white z-10 font-medium">ON</span>
                                                                ) : (
                                                                    <span className="absolute right-1.5 top-1 text-xs text-gray-600 z-10 font-medium">OFF</span>
                                                                )}
                                                            </button>

                                                        </div>



                                                        {/* Actions Column */}
                                                        <div className="col-span-2 flex items-center justify-center">
                                                            <div className="dropdown-container relative">
                                                                <motion.button
                                                                    className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 group-hover:bg-indigo-100/50"
                                                                    onClick={() => toggleDropdown(group.group_id)}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                >
                                                                    <FiMoreVertical className="w-5 h-5" />
                                                                </motion.button>
                                                                <AnimatePresence>
                                                                    {isDropdownOpen && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                                                                        >
                                                                            <div className="py-1">
                                                                                {/* Edit Button */}
                                                                                <button
                                                                                    onClick={() => handleEdit(group)}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200 group"
                                                                                >
                                                                                    <svg className="w-4 h-4 mr-3 text-indigo-500 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                                    </svg>
                                                                                    Edit Group
                                                                                </button>

                                                                                {/* Divider */}
                                                                                <div className="w-full h-px bg-gray-200 my-1"></div>

                                                                                {/* Delete Button */}
                                                                                <button
                                                                                    onClick={group.count > 0 ? undefined : () => handleDelete(group)}
                                                                                    disabled={group.count > 0}
                                                                                    className={`flex items-center w-full px-4 py-2 text-sm transition-all duration-150 group ${group.count > 0
                                                                                        ? 'text-gray-400 bg-gray-50 cursor-not-allowed hover:bg-gray-100'
                                                                                        : 'text-red-700 hover:bg-red-50 group-hover:text-red-800'
                                                                                        }`}
                                                                                    title={group.count > 0 ? `Please remove ${group.count} firm(s) first` : 'Delete Group'}
                                                                                >
                                                                                    <FiXCircle className={`w-4 h-4 mr-3 transition-transform ${group.count > 0 ? '' : 'group-hover:-translate-x-0.5'
                                                                                        }`} />
                                                                                    {group.count > 0 ? (
                                                                                        <span className="flex items-center gap-1.5">
                                                                                            Delete Group
                                                                                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                                                                                                {group.count}
                                                                                            </span>
                                                                                        </span>
                                                                                    ) : (
                                                                                        'Delete Group'
                                                                                    )}
                                                                                </button>

                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>

                                                            </div>
                                                            <div>
                                                                <div
                                                                    className="flex items-center w-full px-2 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200 cursor-pointer"
                                                                    onClick={() => {
                                                                        setSelectedGroup(group);
                                                                        setShowViewModal(true);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                >
                                                                    <FiEye className="w-4 h-4 mr-3" />
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Table Footer */}
                                <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                                    <div className="px-5 py-3">
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                            <div className="text-sm text-gray-600">
                                                Showing <span className="font-semibold">{filteredGroups.length}</span> of{" "}
                                                <span className="font-semibold">{groups.length}</span> groups
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-sm">
                                                    <span className="text-gray-600">Active: </span>
                                                    <span className="font-semibold text-green-600">{summary.activeGroups}</span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-gray-600">Firms: </span>
                                                    <span className="font-semibold text-blue-600">{summary.totalFirms}</span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-gray-600">Inactive: </span>
                                                    <span className="font-semibold text-red-600">{summary.totalGroups - summary.activeGroups}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Group Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-b border-indigo-200 px-6 py-4 z-10">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h5 className="text-xl font-bold">Create New Group</h5>
                                        <p className="text-indigo-200 text-sm mt-1">Add a new firm group</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setCreateForm({ name: '', remark: '' });
                                        }}
                                        className="p-2 hover:bg-indigo-700 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleCreateSubmit}>
                                    <div className="space-y-6 mb-8">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Group Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.name}
                                                onChange={(e) => handleCreateChange('name', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all"
                                                placeholder="e.g., GST Clients"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Remark
                                            </label>
                                            <textarea
                                                value={createForm.remark}
                                                onChange={(e) => handleCreateChange('remark', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all min-h-[100px] resize-none"
                                                placeholder="Enter description for this group"
                                                rows="3"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                        <motion.button
                                            type="button"
                                            onClick={() => {
                                                setShowCreateModal(false);
                                                setCreateForm({ name: '', remark: '' });
                                            }}
                                            className="px-5 py-2.5 text-gray-600 hover:text-gray-800 rounded-xl text-sm font-medium transition-colors border border-gray-300 hover:bg-gray-50"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-medium flex items-center gap-2 shadow-md"
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Create Group
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* DELETE CONFIRM MODAL */}
            <AnimatePresence>
                {deleteModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={handleCloseDeleteModal}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-gray-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-rose-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-xl">
                                        <FiXCircle className="w-6 h-6 text-red-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Delete Group?
                                        </h3>
                                        <p className="text-sm text-red-700">
                                            This action cannot be undone
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                                        <FiUsers className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                "{groupToDelete?.name}"
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {groupToDelete?.count || 0} firm(s)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                        <p className="text-sm text-amber-800 flex items-start gap-2">
                                            <FiXCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>This will permanently delete the group and remove it from all records.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6 pt-2 flex gap-3 justify-end bg-gray-50/50">
                                <motion.button
                                    onClick={handleCloseDeleteModal}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={handleConfirmDelete}
                                    disabled={loading}
                                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <FiXCircle className="w-4 h-4" />
                                            Delete Group
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Edit Group Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                        onClick={() => {
                            setShowEditModal(false);
                            setEditForm({ name: '', remark: '' });
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-b border-emerald-200 px-6 py-4 z-10 rounded-t-2xl">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h5 className="text-xl font-bold">Edit Group</h5>
                                        <p className="text-emerald-200 text-sm mt-1">Update group information</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditForm({ name: '', remark: '' });
                                        }}
                                        className="p-2 hover:bg-emerald-500 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <form onSubmit={handleEditSubmit}>
                                    <div className="space-y-6 mb-8">
                                        {/* Group Name */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Group Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => handleEditChange('name', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white outline-none transition-all"
                                                placeholder="Enter group name"
                                                required
                                            />
                                        </div>

                                        {/* Remark */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Remark
                                            </label>
                                            <textarea
                                                value={editForm.remark}
                                                onChange={(e) => handleEditChange('remark', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white outline-none transition-all min-h-[100px] resize-none"
                                                placeholder="Enter description for this group"
                                                rows="3"
                                            />
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                        <motion.button
                                            type="button"
                                            onClick={() => {
                                                setShowEditModal(false);
                                                setEditForm({ name: '', remark: '' });
                                            }}
                                            className="px-6 py-2.5 text-gray-700 hover:text-gray-900 rounded-xl text-sm font-medium transition-all border border-gray-300 hover:bg-gray-100"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {loading ? (
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Update Group
                                                </>
                                            )}
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* View Details Modal */}
            <AnimatePresence>
                {showViewModal && selectedGroup && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowViewModal(false)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl p-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold">Group Details</h3>
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6">
                                {/* Group Name */}
                                <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl">
                                    <div className="p-3 bg-indigo-100 rounded-xl">
                                        <FiUsers className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Group Name</p>
                                        <p className="text-xl font-bold text-gray-900">{selectedGroup.name}</p>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Firms Count</p>
                                        <p className="text-2xl font-bold text-blue-600">{selectedGroup.count}</p>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Status</p>
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${selectedGroup.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {selectedGroup.is_active ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                </div>

                                {/* Remark */}
                                {selectedGroup.remark && (
                                    <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
                                        <p className="text-sm text-gray-700 font-medium mb-1">Remark</p>
                                        <p className="text-sm text-gray-900 italic">"{selectedGroup.remark}"</p>
                                    </div>
                                )}

                                {/* Dates */}
                                <div className="border-gray-100 flex justify-between items-center">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Created</span>
                                        <span className="font-medium">{formatDate(selectedGroup.created_date)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Updated</span>
                                        <span className="font-medium">{formatDate(selectedGroup.updated_date)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </AnimatePresence>

        </div>
    );
};

export default Groups;