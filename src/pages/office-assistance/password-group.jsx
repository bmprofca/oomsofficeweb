import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    FiPlus, FiEdit, FiTrash, FiKey, FiX,
    FiMoreVertical, FiEye, FiBriefcase, FiAlertCircle,
    FiCalendar, FiUser,
    FiSearch, FiRefreshCw, FiFolder,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import TablePagination from '../../components/TablePagination';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { passwordGroupService } from '../../services/passwordGroupService';
import { ViewportTooltip } from '../../components/ViewportTooltip';

/** GET list may return `data` as an array or a legacy wrapped shape. */
const normalizePasswordGroupList = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.groups)) return raw.groups;
    if (raw && Array.isArray(raw.items)) return raw.items;
    return [];
};

/** `true` = active, `false` = inactive. Supports legacy `'active'` / `'inactive'`. */
const isPasswordGroupActive = (status) =>
    status === true ||
    status === 'true' ||
    String(status || '').toLowerCase() === 'active';

const passwordGroupStatusLabel = (status) =>
    isPasswordGroupActive(status) ? 'Active' : 'Inactive';

const ACTIONS_MENU_WIDTH = 224;
const ACTIONS_MENU_HEIGHT = 220;
const MENU_EDGE_GAP = 4;

const computeActionsMenuCoords = (buttonEl) => {
    const rect = buttonEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;
    const alignRight = spaceRight < ACTIONS_MENU_WIDTH;

    let left = alignRight ? rect.right - ACTIONS_MENU_WIDTH : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - ACTIONS_MENU_WIDTH - 8));

    const topIfDown = rect.bottom + MENU_EDGE_GAP;
    const wouldOverflowBottom = topIfDown + ACTIONS_MENU_HEIGHT > window.innerHeight - 8;
    const openUp =
        spaceBelow < ACTIONS_MENU_HEIGHT || (wouldOverflowBottom && spaceBelow < rect.top);

    if (!openUp) {
        return { placement: 'down', left, top: topIfDown };
    }

    return {
        placement: 'up',
        left,
        bottom: window.innerHeight - rect.top + MENU_EDGE_GAP,
    };
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
    const [dropdownCoords, setDropdownCoords] = useState(null);
    const dropdownAnchorRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: false
    });
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

    // Drop legacy `page` / `limit` query keys so bookmarks do not keep them in the URL
    useEffect(() => {
        const next = new URLSearchParams(searchParams);
        if (!next.has('page') && !next.has('limit')) return;
        next.delete('page');
        next.delete('limit');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const closeActionsMenu = useCallback(() => {
        setActiveDropdown(null);
        setDropdownCoords(null);
        dropdownAnchorRef.current = null;
    }, []);

    const applyStatusFilter = (data, status) => {
        if (status === 'all') return data;
        if (status === 'active') {
            return (data || []).filter((group) => isPasswordGroupActive(group.status));
        }
        if (status === 'inactive') {
            return (data || []).filter((group) => !isPasswordGroupActive(group.status));
        }
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
                const list = normalizePasswordGroupList(result.data);
                setGroups(list);
                setFilteredGroups(applyStatusFilter(list, statusFilter));
                setPagination({
                    page: result.meta?.page || 1,
                    limit: result.meta?.limit || 20,
                    total: result.meta?.total || 0,
                    total_pages: result.meta?.total_pages || 1,
                    is_last_page: result.meta?.is_last_page || false
                });
                if (searchValue?.trim()) {
                    setSearchParams({ search: searchValue.trim() }, { replace: true });
                } else {
                    setSearchParams({}, { replace: true });
                }
            } else {
                toast.error(result.message || 'Failed to fetch groups');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            toast.error('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // Handle create group submit
    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        if (!createForm.group_name.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        const loadingToast = toast.loading('Creating group...');

        try {
            const response = await passwordGroupService.createGroup({
                group_name: createForm.group_name.trim(),
            });
            const result = response.data;

            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success(`Group "${createForm.group_name}" created successfully`);
                await fetchGroupsData();
                setShowCreateModal(false);
                setCreateForm({ group_name: '' });
            } else {
                toast.error(result.message || 'Failed to create group');
            }
        } catch (error) {
            console.error('Error creating group:', error);
            toast.dismiss(loadingToast);
            toast.error('Network error. Please check your connection.');
        }
    };

    // Handle edit group submit
    const handleEditSubmit = async (e) => {
        e.preventDefault();

        if (!editForm.group_name.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        const loadingToast = toast.loading('Updating group...');

        try {
            const response = await passwordGroupService.editGroup(editForm.group_id, {
                group_name: editForm.group_name.trim(),
                status: editForm.status === 'active',
            });
            const result = response.data;

            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success(`Group "${editForm.group_name}" updated successfully`);
                await fetchGroupsData();
                setShowEditModal(false);
                setSelectedGroup(null);
                setEditForm({ group_id: '', group_name: '', status: '' });
            } else {
                toast.error(result.message || 'Failed to update group');
            }
        } catch (error) {
            console.error('Error editing group:', error);
            toast.dismiss(loadingToast);
            toast.error('Network error. Please check your connection.');
        }
    };

    // Handle edit button click
    const handleEditClick = (group) => {
        setSelectedGroup(group);
        setEditForm({
            group_id: group.group_id,
            group_name: group.group_name,
            status: isPasswordGroupActive(group.status) ? 'active' : 'inactive',
        });
        setShowEditModal(true);
        closeActionsMenu();
    };

    // Handle delete button click (UI also disables when firms are linked)
    const handleDeleteClick = (group) => {
        if ((group.unique_firms ?? 0) > 0) return;
        setSelectedGroup(group);
        setShowDeleteModal(true);
        closeActionsMenu();
    };

    // Handle delete confirm
    const handleDeleteConfirm = async () => {
        if (!selectedGroup) return;

        const loadingToast = toast.loading('Deleting group...');

        try {
            const response = await passwordGroupService.deleteGroup(selectedGroup.group_id);
            const result = response.data;

            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success(`Group "${selectedGroup.group_name}" deleted successfully`);
                await fetchGroupsData();
                setShowDeleteModal(false);
                setSelectedGroup(null);
            } else {
                toast.error(result.message || 'Failed to delete group');
            }
        } catch (error) {
            console.error('Error deleting group:', error);
            toast.dismiss(loadingToast);
            toast.error('Network error. Please check your connection.');
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
        closeActionsMenu();
    };

    // Handle group name click
    const handleGroupNameClick = (group) => {
        handleViewGroupFirms(group);
    };

    // Handle firms count click
    const handleFirmsClick = (group) => {
        handleViewGroupFirms(group);
    };

    const toggleDropdown = (groupId, buttonElement) => {
        if (activeDropdown === groupId) {
            closeActionsMenu();
            return;
        }
        dropdownAnchorRef.current = buttonElement || null;
        if (buttonElement) {
            setDropdownCoords(computeActionsMenuCoords(buttonElement));
        } else {
            setDropdownCoords(null);
        }
        setActiveDropdown(groupId);
    };

    useEffect(() => {
        if (!activeDropdown || !dropdownAnchorRef.current) return;
        const el = dropdownAnchorRef.current;
        const update = () => setDropdownCoords(computeActionsMenuCoords(el));
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [activeDropdown]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                event.target.closest('.dropdown-container') ||
                event.target.closest('[data-password-groups-list-actions-menu]')
            ) {
                return;
            }
            closeActionsMenu();
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [closeActionsMenu]);

    useEffect(() => {
        if (!activeDropdown) return;
        if (!filteredGroups.some((g) => g.group_id === activeDropdown)) {
            closeActionsMenu();
        }
    }, [filteredGroups, activeDropdown, closeActionsMenu]);

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

    const activeActionsGroup =
        activeDropdown == null
            ? null
            : filteredGroups.find((g) => g.group_id === activeDropdown) ?? null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
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
                    {/* Main Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden"
                    >
                        {/* Table toolbar: title, search, refresh, create */}
                        <div className="border-b border-slate-200 px-4 sm:px-5 py-4 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2.5 bg-indigo-100 rounded-xl shrink-0">
                                        <FiKey className="w-5 h-5 text-indigo-600" aria-hidden />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-semibold text-slate-800 leading-tight">
                                            Password Groups
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Credential groups for your office
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-0 lg:flex-1 lg:justify-end">
                                    <div className="relative w-full sm:flex-1 sm:max-w-xs lg:max-w-sm">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                            <FiSearch className="w-4 h-4 shrink-0" aria-hidden />
                                        </span>
                                        <input
                                            type="search"
                                            placeholder="Search by group name…"
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-full py-2.5 pl-10 pr-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                            aria-label="Search password groups"
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-2 shrink-0">
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleRefresh}
                                            disabled={loading}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none"
                                            aria-label="Refresh list"
                                        >
                                            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                        </motion.button>
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowCreateModal(true)}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-200/60 transition-all hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        >
                                            <FiPlus className="w-4 h-4 shrink-0" aria-hidden />
                                            <span>New group</span>
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-100/90 border-b border-slate-200">
                                    <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                            #
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                            Group Details
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                            Firms
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                            Status
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                            Created
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-slate-700 uppercase tracking-wide">
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
                                                    <td key={cellIndex} className="px-3 py-2">
                                                        <div className="h-3.5 bg-slate-200 rounded animate-pulse" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : filteredGroups.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-slate-100 rounded-full mb-4">
                                                        <FiFolder className="w-8 h-8 text-slate-400" />
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
                                                className="group hover:bg-slate-50/90 transition-colors duration-150"
                                            >
                                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-600 font-medium rounded-lg text-xs">
                                                        {((pagination.page - 1) * pagination.limit) + index + 1}
                                                    </span>
                                                </td>

                                                {/* Group Name - Clickable */}
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGroupNameClick(group)}
                                                            className="group/name flex min-w-0 max-w-full flex-1 items-center gap-2 text-left focus:outline-none"
                                                        >
                                                            <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 p-2 transition-transform duration-200 group-hover/name:scale-110">
                                                                <FiFolder className="h-4 w-4 text-indigo-600" />
                                                            </div>
                                                            <div className="text-left">
                                                                <span className="text-sm font-semibold text-slate-800 transition-colors duration-200">
                                                                    {group.group_name}
                                                                </span>
                                                                {group.description && (
                                                                    <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Firms Count - Clickable Compact Badge */}
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleFirmsClick(group)}
                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 focus:outline-none ${group.unique_firms > 0
                                                            ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        <FiBriefcase className={`h-3.5 w-3.5 ${group.unique_firms > 0 ? 'text-blue-600' : 'text-slate-500'}`} />
                                                        <span>{group.unique_firms || 0} firms</span>
                                                    </button>
                                                </td>

                                                {/* Status (read-only; change via Edit) */}
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div
                                                        role="status"
                                                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${isPasswordGroupActive(group.status)
                                                            ? 'border-green-200 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
                                                            : 'border-slate-200 bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600'
                                                            }`}
                                                    >
                                                        <span className={`h-2 w-2 shrink-0 rounded-full ${isPasswordGroupActive(group.status) ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                        {passwordGroupStatusLabel(group.status)}
                                                    </div>
                                                </td>

                                                {/* Created Info */}
                                                <td className="px-3 py-2 whitespace-nowrap">
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
                                                <td className="px-3 py-2 whitespace-nowrap text-right">
                                                    <div className="relative dropdown-container inline-block">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => toggleDropdown(group.group_id, e.currentTarget)}
                                                            className="rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-600"
                                                            aria-label="More actions"
                                                            aria-expanded={activeDropdown === group.group_id}
                                                        >
                                                            <FiMoreVertical className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <TablePagination
                            showRange
                            showRows
                            rowOptions={[5, 10, 20, 50, 100]}
                            defaultRows={20}
                            showJump
                            showFirstLast
                            page={pagination.page}
                            limit={pagination.limit}
                            total={pagination.total}
                            totalPages={pagination.total_pages}
                            isLastPage={pagination.is_last_page}
                            onPageChange={(nextPage) =>
                                setPagination((prev) => ({ ...prev, page: nextPage }))
                            }
                            onLimitChange={(nextLimit) => {
                                const safe = Math.min(100, Math.max(1, Number(nextLimit) || 20));
                                setPagination((prev) => ({ ...prev, page: 1, limit: safe }));
                            }}
                        />
                    </motion.div>
                </div>
            </div>

            {/* Create Modal — layout per context/modal.md */}
            <AnimatePresence>
                {showCreateModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="flex min-h-0 w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="shrink-0 rounded-xl bg-white/20 p-2">
                                            <FiPlus className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="truncate text-lg font-semibold text-white">Create New Group</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/10"
                                        aria-label="Close"
                                    >
                                        <FiX className="h-5 w-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                <div
                                    className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="pg-create-name">
                                        Group Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="pg-create-name"
                                        type="text"
                                        value={createForm.group_name}
                                        onChange={(e) => handleCreateChange('group_name', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter group name (e.g., Banking Portals)"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={loading || !createForm.group_name.trim()}
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Creating…
                                            </span>
                                        ) : (
                                            'Create Group'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal — layout per context/modal.md */}
            <AnimatePresence>
                {showEditModal && selectedGroup && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="flex min-h-0 w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="shrink-0 bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-3.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="shrink-0 rounded-xl bg-white/20 p-2">
                                            <FiEdit className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="truncate text-lg font-semibold text-white">Edit Group</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/10"
                                        aria-label="Close"
                                    >
                                        <FiX className="h-5 w-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                <div
                                    className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="pg-edit-name">
                                            Group Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="pg-edit-name"
                                            type="text"
                                            value={editForm.group_name}
                                            onChange={(e) => handleEditChange('group_name', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            placeholder="Enter group name"
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3.5">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-sm font-semibold text-slate-800">Status</p>
                                            <div className="flex items-center gap-3 sm:shrink-0">
                                                <span
                                                    className={`min-w-[4.25rem] text-right text-sm font-semibold tabular-nums ${editForm.status === 'active' ? 'text-emerald-700' : 'text-slate-600'}`}
                                                >
                                                    {editForm.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={editForm.status === 'active'}
                                                    aria-label={editForm.status === 'active' ? 'Set inactive' : 'Set active'}
                                                    onClick={() =>
                                                        handleEditChange('status', editForm.status === 'active' ? 'inactive' : 'active')
                                                    }
                                                    className={`relative h-8 w-12 shrink-0 rounded-full p-0.5 shadow-inner transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                                                        editForm.status === 'active'
                                                            ? 'bg-emerald-500 ring-1 ring-emerald-600/30'
                                                            : 'bg-slate-300 ring-1 ring-slate-400/25'
                                                    }`}
                                                >
                                                    <motion.span
                                                        initial={false}
                                                        transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                                                        className="block h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-slate-900/[0.06]"
                                                        animate={{ x: editForm.status === 'active' ? 20 : 0 }}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-200 transition-all duration-200 hover:from-amber-700 hover:to-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={loading || !editForm.group_name.trim()}
                                    >
                                        {loading ? 'Updating…' : 'Update Group'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Details Modal — layout per context/modal.md */}
            <AnimatePresence>
                {showViewModal && selectedGroup && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4"
                        onClick={() => setShowViewModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3.5 shrink-0">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-white/20 rounded-xl shrink-0">
                                            <FiEye className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-white truncate">Group Details</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowViewModal(false)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                                        aria-label="Close"
                                    >
                                        <FiX className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            <div
                                className="px-5 py-4 overflow-y-auto flex-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-medium text-slate-500">Group Name</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-800">{selectedGroup.group_name || '-'}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-medium text-slate-500">Status</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {passwordGroupStatusLabel(selectedGroup.status)}
                                        </p>
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
                            </div>

                            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex justify-end shrink-0">
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

            {/* Delete Modal — layout per context/modal.md */}
            <AnimatePresence>
                {showDeleteModal && selectedGroup && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="flex min-h-0 w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="shrink-0 bg-gradient-to-r from-red-600 to-red-700 px-5 py-3.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="shrink-0 rounded-xl bg-white/20 p-2">
                                            <FiAlertCircle className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="truncate text-lg font-semibold text-white">Delete Group</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteModal(false)}
                                        className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/10"
                                        aria-label="Close"
                                    >
                                        <FiX className="h-5 w-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            <div
                                className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div className="mb-5 flex justify-center">
                                    <div className="rounded-full bg-red-100 p-4">
                                        <FiAlertCircle className="h-8 w-8 text-red-600" />
                                    </div>
                                </div>
                                <p className="mb-3 text-center text-sm text-slate-700">
                                    Are you sure you want to delete this group?
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-center text-sm text-slate-600">
                                        <span className="font-semibold text-slate-800">{selectedGroup.group_name}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteConfirm}
                                    className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-200 transition-all duration-200 hover:from-red-700 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? 'Deleting…' : 'Delete Group'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {activeDropdown && dropdownCoords && activeActionsGroup && (
                            <motion.div
                                key={activeDropdown}
                                role="menu"
                                data-password-groups-list-actions-menu
                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    position: 'fixed',
                                    ...(dropdownCoords.placement === 'up'
                                        ? {
                                              bottom: dropdownCoords.bottom,
                                              left: dropdownCoords.left,
                                          }
                                        : {
                                              top: dropdownCoords.top,
                                              left: dropdownCoords.left,
                                          }),
                                    width: ACTIONS_MENU_WIDTH,
                                    zIndex: 2147483647,
                                }}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
                            >
                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={() => handleViewDetailsClick(activeActionsGroup)}
                                        className="flex w-full items-center px-4 py-3 text-sm text-slate-700 transition-all duration-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50"
                                    >
                                        <div className="mr-3 rounded-lg bg-indigo-100 p-1.5">
                                            <FiEye className="h-3.5 w-3.5 text-indigo-600" />
                                        </div>
                                        <span>View Details</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleEditClick(activeActionsGroup)}
                                        className="flex w-full items-center px-4 py-3 text-sm text-slate-700 transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50"
                                    >
                                        <div className="mr-3 rounded-lg bg-amber-100 p-1.5">
                                            <FiEdit className="h-3.5 w-3.5 text-amber-600" />
                                        </div>
                                        <span>Edit Group</span>
                                    </button>

                                    {(activeActionsGroup.unique_firms ?? 0) > 0 ? (
                                        <ViewportTooltip
                                            fullWidth
                                            label="Remove all linked firms before you can delete this group"
                                        >
                                            <button
                                                type="button"
                                                disabled
                                                className="flex w-full min-w-0 cursor-not-allowed items-center px-4 py-3 text-left text-sm text-slate-400 transition-all duration-200"
                                            >
                                                <div className="mr-3 shrink-0 rounded-lg bg-slate-100 p-1.5">
                                                    <FiTrash className="h-3.5 w-3.5 text-slate-400" />
                                                </div>
                                                <span className="min-w-0">Delete Group</span>
                                            </button>
                                        </ViewportTooltip>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteClick(activeActionsGroup)}
                                            className="flex w-full items-center px-4 py-3 text-sm text-slate-700 transition-all duration-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50"
                                        >
                                            <div className="mr-3 rounded-lg bg-red-100 p-1.5">
                                                <FiTrash className="h-3.5 w-3.5 text-red-600" />
                                            </div>
                                            <span>Delete Group</span>
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
};

export default PasswordGroups;