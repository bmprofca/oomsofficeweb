import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    FiUsers,
    FiPlus,
    FiEye,
    FiShield,
    FiSearch,
    FiUser,
    FiPhone,
    FiMenu
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import Modal from '../../components/common/Modal';
import TablePagination from '../../components/TablePagination';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import { clearUserPermissionCache, fetchUserPermissions } from '../../utils/permission-helper';

const ACTIONS_MENU_WIDTH = 192;
const ACTIONS_MENU_HEIGHT = 120;

function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

const AnimatedCheckbox = ({ checked, indeterminate = false, onChange, ariaLabel, disabled = false }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate, checked]);

    const isActive = checked || indeterminate;

    return (
        <label className={`relative inline-flex items-center group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
                ref={inputRef}
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
                disabled={disabled}
            />
            <motion.span
                className={`flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border-2 transition-colors duration-200 ${
                    isActive
                        ? 'bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-200'
                        : 'bg-white border-gray-300 group-hover:border-indigo-400'
                }`}
                animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
                transition={{ duration: 0.18 }}
                whileTap={disabled ? {} : { scale: 0.92 }}
            >
                <AnimatePresence initial={false} mode="wait">
                    {indeterminate ? (
                        <motion.span
                            key="dash"
                            className="block w-2 h-0.5 bg-white rounded-full"
                            initial={{ opacity: 0, scaleX: 0.4 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0.4 }}
                            transition={{ duration: 0.12 }}
                        />
                    ) : checked ? (
                        <motion.svg
                            key="check"
                            viewBox="0 0 12 12"
                            className="w-3 h-3 text-white"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <path
                                d="M2.5 6l2.2 2.2 4.8-4.8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </motion.svg>
                    ) : null}
                </AnimatePresence>
            </motion.span>
        </label>
    );
};

const StaffList = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 300);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedPermission, setSelectedPermission] = useState('');
    const [selectedStaff, setSelectedStaff] = useState(new Set());
    const [bulkPermissionRole, setBulkPermissionRole] = useState('');
    const [bulkAssigning, setBulkAssigning] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedStaffMember, setSelectedStaffMember] = useState(null);    
    // Dynamic permissions & staff
    const [staffData, setStaffData] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissionOptions, setPermissionOptions] = useState([]);
    
    // Permission assignment modal state
    const [modalLoading, setModalLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');
    const [customPermissions, setCustomPermissions] = useState([]);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: undefined, right: 0, bottom: undefined });
    const actionAnchorRef = useRef(null);
    const [expandedCategories, setExpandedCategories] = useState({});
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [tableLoading, setTableLoading] = useState(false);
    const [newStaff, setNewStaff] = useState({
        name: '',
        guardian_name: '',
        mobile: '',
        email: '',
        dob: '',
        gender: '',
        designation: '',
        permission_id: '',
        state: '',
        dist: '',
        town: '',
        pincode: '',
        address_line_1: '',
        address_line_2: ''
    });

    const designations = [
        { value: 'manager', name: 'Manager' },
        { value: 'supervisor', name: 'Supervisor' },
        { value: 'accountant', name: 'Accountant' },
        { value: 'assistant', name: 'Assistant' },
        { value: 'administrator', name: 'Administrator' }
    ];

    const genders = [
        { value: 'male', name: 'Male' },
        { value: 'female', name: 'Female' },
        { value: 'other', name: 'Other' }
    ];

    const statusOptions = [
        { value: 'active', name: 'Active' },
        { value: 'inactive', name: 'Inactive' }
    ];

    const getCategoryName = (pOptionId) => {
        const id = pOptionId.toLowerCase();
        if (id.startsWith('recurring_task_')) return 'Compliance';
        if (id.startsWith('dashboard_') || 
            ['sales_overview_view', 'quick_stats_view', 'task_summary_view', 'service_wise_sales_view', 'staff_wise_sales_view', 'top_clients_view', 'dashboard_statistics_view'].includes(id)) {
            return 'Dashboard Statistics';
        }
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

    // Human-readable labels for permission keys
    const PERM_LABELS = {
        task_create: 'Create Task',
        task_cancel: 'Cancel Task',
        task_complete: 'Complete Task',
        task_fees_view: 'Fees View',
        client_create: 'Create Client',
        client_edit: 'Edit Client',
        client_delete: 'Delete Client',
        finance_balance_view: 'Balance View',
        finance_entry: 'Finance Entry',
        finance_entry_edit: 'Edit Entry',
        finance_entry_delete: 'Delete Entry',
        finance_report: 'Finance Report',
        finance_billing_approve_reject: 'Billing Approve',
        broadcast_config_edit: 'Broadcast Config',
        broadcast_send: 'Send Broadcast',
        broadcast_livechat: 'LiveChat',
        setting_view_edit: 'Settings',
        subscription_manage: 'Subscription',
        staff_attendance_view_manage: 'Staff & Attendance',
        office_assistance_access: 'Office Assistance',
        recurring_task_create: 'Compliance Create',
        recurring_task_delete: 'Compliance Delete',
        recurring_task_complete: 'Compliance Complete',
        recurring_task_fees_view: 'Compliance Fees',
        sales_overview_view: 'Sales Overview',
        quick_stats_view: 'Quick Stats',
        task_summary_view: 'Task Summary',
        service_wise_sales_view: 'Service Wise Sales',
        staff_wise_sales_view: 'Staff Wise Sales',
        top_clients_view: 'Top Clients',
        dashboard_statistics_view: 'Dashboard Statistics'
    };

    const getPermLabel = (key) => {
        // First: look up the actual name from API-fetched permissionOptions
        const opt = permissionOptions.find(o => o.p_option_id === key);
        if (opt?.name) return opt.name;
        // Second: fall back to local label map
        if (PERM_LABELS[key]) return PERM_LABELS[key];
        // Third: prettify the key as last resort
        return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const getGroupedOptions = () => {
        const groups = {};
        permissionOptions.forEach(option => {
            const cat = getCategoryName(option.p_option_id);
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(option);
        });
        return groups;
    };

    const getRolePermissions = (roleId) => {
        const role = roles.find(r => r.permission_role_id === roleId);
        return role ? (role.permissions || []) : [];
    };

    // Load initial data
    const fetchRoles = async () => {
        try {
            const headers = getHeaders();
            if (!headers) return;
            const res = await axios.get(`${API_BASE_URL}/settings/permissions/list`, { headers });
            if (res.data?.success) {
                setRoles(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching roles:', err);
        }
    };

    const fetchPermissionOptions = async () => {
        try {
            const headers = getHeaders();
            if (!headers) return;
            const res = await axios.get(`${API_BASE_URL}/settings/permissions/options`, { headers });
            if (res.data?.success) {
                let options = res.data.data || [];
                const dashboardOptions = [
                    { p_option_id: 'sales_overview_view', name: 'Sales Overview View', remark: 'View sales overview widget' },
                    { p_option_id: 'quick_stats_view', name: 'Quick Stats View', remark: 'View quick stats widget' },
                    { p_option_id: 'task_summary_view', name: 'Task Summary View', remark: 'View task summary widget' },
                    { p_option_id: 'service_wise_sales_view', name: 'Service Wise Sales View', remark: 'View service wise sales widget' },
                    { p_option_id: 'staff_wise_sales_view', name: 'Staff Wise Sales View', remark: 'View staff wise sales widget' },
                    { p_option_id: 'top_clients_view', name: 'Top Clients View', remark: 'View top clients widget' },
                    { p_option_id: 'dashboard_statistics_view', name: 'Dashboard Statistics View', remark: 'View dashboard statistics cards' }
                ];
                dashboardOptions.forEach(opt => {
                    if (!options.some(o => o.p_option_id === opt.p_option_id)) {
                        options.push(opt);
                    }
                });
                setPermissionOptions(options);
            }
        } catch (err) {
            console.error('Error fetching permission options:', err);
        }
    };

    const transformStaffData = (apiData) => {
        return apiData.map((staffMember, index) => {
            const isAccepted = staffMember.is_accepted === true;
            const profile = staffMember.profile || {};
            // Capture custom_permissions if returned by the list API
            const customPerms = staffMember.custom_permissions || staffMember.permissions || [];
            return {
                id: staffMember.map_id || staffMember.id || (index + 1).toString(),
                username: staffMember.username || '',
                name: profile.name || 'Unknown',
                guardian_name: profile.guardian_name || profile.care_of || '',
                mobile: profile.mobile ? `${profile.country_code || '+91'} ${profile.mobile}` : 'N/A',
                email: profile.email || 'N/A',
                designation: staffMember.designation || 'Not Assigned',
                permission_role_id: staffMember.permission_role_id || staffMember.permission_role?.permission_role_id || '',
                custom_permissions: Array.isArray(customPerms) ? customPerms : [],
                is_accepted: isAccepted,
                status: isAccepted ? 1 : 0,
                is_active: staffMember.status === true,
                created_date: staffMember.modify_date || new Date().toISOString().split('T')[0]
            };
        });
    };

    const fetchStaffData = useCallback(async () => {
        setTableLoading(true);
        const headers = getHeaders();
        if (!headers) {
            setTableLoading(false);
            return;
        }
        try {
            const params = new URLSearchParams({
                search: debouncedSearch.trim(),
                page: String(currentPage),
                limit: String(itemsPerPage),
            });
            if (selectedStatus) params.set('status', selectedStatus);
            if (selectedPermission) params.set('permission_role_id', selectedPermission);

            const res = await axios.get(
                `${API_BASE_URL}/settings/staff/list?${params.toString()}`,
                { headers }
            );
            if (res.data?.success && res.data.data) {
                setStaffData(transformStaffData(res.data.data));
                const meta = res.data.meta || {};
                const total = meta.total ?? 0;
                setTotalItems(total);
                setTotalPages(Math.max(1, meta.total_pages ?? Math.ceil(total / itemsPerPage)));
            } else {
                setStaffData([]);
                setTotalItems(0);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Error fetching staff list:', error);
            setStaffData([]);
            setTotalItems(0);
            setTotalPages(1);
        } finally {
            setTableLoading(false);
        }
    }, [debouncedSearch, currentPage, itemsPerPage, selectedStatus, selectedPermission]);

    const skipSearchPageReset = useRef(true);

    useEffect(() => {
        if (skipSearchPageReset.current) {
            skipSearchPageReset.current = false;
            return;
        }
        setCurrentPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        fetchStaffData();
    }, [fetchStaffData]);

    useEffect(() => {
        fetchRoles();
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

    // Close export dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowExportDropdown(false);
            }
            if (
                !event.target.closest('[data-staff-actions-menu]') &&
                !event.target.closest('[data-staff-actions-trigger]')
            ) {
                setActiveRowDropdown(null);
                actionAnchorRef.current = null;
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const updateDropdownPosition = useCallback((anchorEl) => {
        if (!anchorEl) return;
        const rect = anchorEl.getBoundingClientRect();
        const margin = 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < ACTIONS_MENU_HEIGHT + margin && spaceAbove > spaceBelow;

        let top;
        let bottom;
        if (openUpward) {
            top = undefined;
            bottom = Math.max(margin, window.innerHeight - rect.top + 4);
        } else {
            top = Math.min(rect.bottom + 4, window.innerHeight - ACTIONS_MENU_HEIGHT - margin);
            bottom = undefined;
        }

        const right = Math.max(
            margin,
            Math.min(window.innerWidth - rect.right, window.innerWidth - ACTIONS_MENU_WIDTH - margin)
        );

        setDropdownPos({
            top,
            bottom,
            right,
            left: undefined,
        });
    }, []);

    const openActionsFromButton = useCallback((e, username) => {
        e.stopPropagation();
        if (activeRowDropdown === username) {
            setActiveRowDropdown(null);
            actionAnchorRef.current = null;
            return;
        }
        actionAnchorRef.current = e.currentTarget;
        updateDropdownPosition(e.currentTarget);
        setActiveRowDropdown(username);
    }, [activeRowDropdown, updateDropdownPosition]);

    // Staff list is server-filtered via API
    const activeStaffForMenu = useMemo(
        () => staffData.find((staff) => staff.username === activeRowDropdown) || null,
        [staffData, activeRowDropdown]
    );

    useEffect(() => {
        if (!activeRowDropdown) return undefined;

        const handleScrollOrResize = () => {
            if (actionAnchorRef.current) {
                updateDropdownPosition(actionAnchorRef.current);
            }
        };

        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [activeRowDropdown, updateDropdownPosition]);

    const pageUsernames = useMemo(() => staffData.map((s) => s.username), [staffData]);
    const isAllPageSelected = pageUsernames.length > 0 && pageUsernames.every((u) => selectedStaff.has(u));
    const isSomePageSelected = pageUsernames.some((u) => selectedStaff.has(u)) && !isAllPageSelected;

    // Handle staff selection
    const handleStaffSelect = (username) => {
        setSelectedStaff((prev) => {
            const next = new Set(prev);
            if (next.has(username)) {
                next.delete(username);
            } else {
                next.add(username);
            }
            return next;
        });
    };

    // Handle select all on current page
    const handleSelectAll = () => {
        setSelectedStaff((prev) => {
            const next = new Set(prev);
            if (isAllPageSelected) {
                pageUsernames.forEach((u) => next.delete(u));
            } else {
                pageUsernames.forEach((u) => next.add(u));
            }
            return next;
        });
    };

    const handlePageChange = (newPage) => {
        const page = Math.max(1, Math.min(totalPages, Math.floor(newPage)));
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleLimitChange = (newLimit) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1);
    };
    // Handle status change
    const handleStatusChange = async (username, currentStatus) => {
        setTableLoading(true);
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication required');
            setTableLoading(false);
            return;
        }
        try {
            const newStatusString = currentStatus ? 'active' : 'deactive';
            const res = await axios.put(`${API_BASE_URL}/settings/staff/change-status`, {
                username,
                status: newStatusString
            }, { headers });
            
            if (res.data?.success) {
                toast.success(res.data.message || `Staff status updated successfully`);
                setStaffData(prev => prev.map(m => 
                    m.username === username ? { ...m, is_active: currentStatus } : m
                ));
            } else {
                toast.error(res.data?.message || 'Failed to update status');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally {
            setTableLoading(false);
        }
    };

    // Handle permission override modal and assignment
    const openPermissionModal = async (staffMember) => {
        setSelectedStaffMember(staffMember);
        setModalLoading(true);
        setShowPermissionModal(true);
        
        try {
            const headers = getHeaders();
            const res = await axios.get(
                `${API_BASE_URL}/settings/permissions/user-permissions?username=${staffMember.username}`,
                { headers }
            );
            if (res.data?.success) {
                const roleId = res.data.permission_role_id
                    || res.data.data?.permission_role_id
                    || '';
                setSelectedRole(roleId);

                const mergedPermissions = Array.isArray(res.data.permissions)
                    ? res.data.permissions
                    : Array.isArray(res.data.data?.permissions)
                        ? res.data.data.permissions
                        : [];
                const customFromApi = Array.isArray(res.data.data?.custom_permissions)
                    ? res.data.data.custom_permissions
                    : Array.isArray(res.data.custom_permissions)
                        ? res.data.custom_permissions
                        : [];

                let custom = customFromApi;
                if (!custom.length && mergedPermissions.length) {
                    const inherited = getRolePermissions(roleId);
                    custom = mergedPermissions.filter(
                        (permission) => !inherited.includes(permission) && permission !== 'office_assistance_access'
                    );
                }
                setCustomPermissions(custom);
            } else {
                setSelectedRole('');
                setCustomPermissions([]);
            }
        } catch (err) {
            console.error('Error fetching user permissions:', err);
            toast.error('Failed to load user permissions');
            setSelectedRole('');
            setCustomPermissions([]);
        } finally {
            setModalLoading(false);
        }
    };

    const handleAssignPermissions = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const headers = getHeaders();
            const res = await axios.post(
                `${API_BASE_URL}/settings/permissions/assign`,
                {
                    username: selectedStaffMember.username,
                    permission_role_id: selectedRole || null,
                    custom_permissions: customPermissions
                },
                { headers }
            );
            if (res.data?.success) {
                toast.success('Permissions assigned successfully');
                const currentUsername = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
                if (selectedStaffMember?.username === currentUsername) {
                    clearUserPermissionCache(currentUsername, localStorage.getItem('branch_id'));
                    await fetchUserPermissions(true);
                }
                setShowPermissionModal(false);
                fetchStaffData();
            } else {
                toast.error(res.data?.message || 'Failed to assign permissions');
            }
        } catch (err) {
            console.error('Error assigning permissions:', err);
            toast.error(err.response?.data?.message || 'Failed to assign permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAssignPermissions = async () => {
        if (!bulkPermissionRole) {
            toast.error('Please select a permission role');
            return;
        }
        const usernames = Array.from(selectedStaff);
        if (!usernames.length) return;

        setBulkAssigning(true);
        try {
            const headers = getHeaders();
            const res = await axios.post(
                `${API_BASE_URL}/settings/permissions/assign/bulk`,
                {
                    usernames,
                    permission_role_id: bulkPermissionRole,
                    custom_permissions: [],
                },
                { headers }
            );
            if (res.data?.success) {
                const updatedCount = res.data.data?.updated_count ?? usernames.length;
                toast.success(res.data.message || `Updated ${updatedCount} staff member(s)`);
                const currentUsername = localStorage.getItem('user_username') || localStorage.getItem('username') || '';
                if (currentUsername && usernames.includes(currentUsername)) {
                    clearUserPermissionCache(currentUsername, localStorage.getItem('branch_id'));
                    await fetchUserPermissions(true);
                }
                setSelectedStaff(new Set());
                setBulkPermissionRole('');
                fetchStaffData();
            } else {
                toast.error(res.data?.message || 'Failed to update permissions');
            }
        } catch (err) {
            console.error('Error bulk assigning permissions:', err);
            toast.error(err.response?.data?.message || 'Failed to update permissions');
        } finally {
            setBulkAssigning(false);
        }
    };

    const toggleCustomPermission = (pOptionId) => {
        setCustomPermissions(prev => {
            if (prev.includes(pOptionId)) {
                return prev.filter(id => id !== pOptionId);
            } else {
                return [...prev, pOptionId];
            }
        });
    };

    // Handle create staff (locally mocked since no API available)
    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            const newStaffMember = {
                id: `${staffData.length + 1}`,
                username: `staff${Date.now()}`,
                ...newStaff,
                password: '******',
                permission_role_id: newStaff.permission_id,
                is_accepted: true,
                status: 1,
                is_active: true,
                created_date: new Date().toISOString().split('T')[0]
            };
            setStaffData(prev => [newStaffMember, ...prev]);
            setNewStaff({
                name: '',
                guardian_name: '',
                mobile: '',
                email: '',
                dob: '',
                gender: '',
                designation: '',
                permission_id: '',
                state: '',
                dist: '',
                town: '',
                pincode: '',
                address_line_1: '',
                address_line_2: ''
            });
            setShowCreateModal(false);
            setLoading(false);
            toast.success('Staff member created successfully');
        }, 1000);
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            toast.success(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    // Skeleton loader component
    const tableCellPad = isMinimized ? 'p-4' : 'px-2 py-3 sm:px-3 sm:py-3.5';

    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className={tableCellPad}>
                <div className="w-[18px] h-[18px] bg-gray-200 rounded" />
            </td>
            <td className={tableCellPad}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-32" />
                        <div className="h-2 bg-gray-200 rounded w-24" />
                    </div>
                </div>
            </td>
            <td className={tableCellPad}>
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
            </td>
            <td className={tableCellPad}>
                <div className="h-8 bg-gray-200 rounded w-28" />
            </td>
            <td className={tableCellPad}>
                <div className="h-6 bg-gray-200 rounded w-11" />
            </td>
            <td className={tableCellPad}>
                <div className="mx-auto h-8 w-8 bg-gray-200 rounded" />
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
                <div className={`max-w-full mx-auto py-4 sm:py-6 ${isMinimized ? 'px-4 sm:px-6 md:px-8' : 'px-3 sm:px-4 lg:px-6'}`}>
                    <div className="h-full flex flex-col">
                        {/* Main Card - Full height with scrolling */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                            {/* Card Header */}
                            <div className={`border-b border-gray-200 py-3 sm:py-4 ${isMinimized ? 'px-4 sm:px-6' : 'px-3 sm:px-4 lg:px-5'}`}>
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h5 className={`font-bold text-gray-800 mb-0.5 truncate ${isMinimized ? 'text-xl' : 'text-lg sm:text-xl'}`}>
                                                Staff Management
                                            </h5>
                                            <p className="text-gray-500 text-xs">
                                                {totalItems} staff member{totalItems === 1 ? '' : 's'} total
                                            </p>
                                        </div>
                                        <motion.button
                                            onClick={() => setShowCreateModal(true)}
                                            className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-sm"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            <span className="hidden min-[400px]:inline">Add Staff</span>
                                            <span className="min-[400px]:hidden">Add</span>
                                        </motion.button>
                                    </div>

                                    <div className="relative w-full min-w-0">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder={isMinimized ? 'Search by name, mobile, email...' : 'Search staff...'}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full min-w-0 pl-9 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <select
                                            value={selectedPermission}
                                            onChange={(e) => {
                                                setCurrentPage(1);
                                                setSelectedPermission(e.target.value);
                                            }}
                                            className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none sm:min-w-[8.5rem] max-w-full px-2.5 sm:px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-xs sm:text-sm truncate"
                                        >
                                            <option value="">All Permissions</option>
                                            {roles.map(role => (
                                                <option key={role.permission_role_id} value={role.permission_role_id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => {
                                                setCurrentPage(1);
                                                setSelectedStatus(e.target.value);
                                            }}
                                            className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none sm:min-w-[7rem] max-w-full px-2.5 sm:px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-xs sm:text-sm"
                                        >
                                            <option value="">All Status</option>
                                            {statusOptions.map(status => (
                                                <option key={status.value} value={status.value}>
                                                    {status.name}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="dropdown-container relative shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                                className="px-2.5 sm:px-3 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-sm whitespace-nowrap"
                                            >
                                                <PiExportBold className="w-4 h-4 shrink-0" />
                                                <span className="hidden sm:inline">Export</span>
                                            </button>

                                            {showExportDropdown && (
                                                <div className="absolute right-0 mt-2 w-52 sm:w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                    <div className="py-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExport('pdf')}
                                                            className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <PiFilePdfDuotone className="w-4 h-4 mr-2 sm:mr-3 text-red-500 shrink-0" />
                                                            Export as PDF
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExport('excel')}
                                                            className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-2 sm:mr-3 text-green-500 shrink-0" />
                                                            Export as Excel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExport('whatsapp')}
                                                            className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <FaWhatsapp className="w-4 h-4 mr-2 sm:mr-3 text-green-500 shrink-0" />
                                                            Share via WhatsApp
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExport('email')}
                                                            className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <AiOutlineMail className="w-4 h-4 mr-2 sm:mr-3 text-blue-500 shrink-0" />
                                                            Share via Email
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Table Container */}
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                        <tr>
                                            <th className={`w-10 sm:w-12 text-left ${isMinimized ? 'px-3 py-3' : 'px-2 py-2.5 sm:px-3 sm:py-3'}`}>
                                                <AnimatedCheckbox
                                                    checked={isAllPageSelected}
                                                    indeterminate={isSomePageSelected}
                                                    onChange={handleSelectAll}
                                                    ariaLabel="Select all staff on this page"
                                                    disabled={tableLoading || staffData.length === 0}
                                                />
                                            </th>
                                            <th className={`text-left text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap ${isMinimized ? 'px-3 py-3' : 'px-2 py-2.5 sm:px-3 sm:py-3'}`}>Staff</th>
                                            <th className={`text-left text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap ${isMinimized ? 'px-3 py-3' : 'px-2 py-2.5 sm:px-3 sm:py-3'}`}>Contact</th>
                                            <th className={`text-left text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap min-w-[7rem] ${isMinimized ? 'px-3 py-3' : 'px-2 py-2.5 sm:px-3 sm:py-3'}`}>Permission</th>
                                            <th className={`text-left text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap ${isMinimized ? 'px-3 py-3' : 'px-2 py-2.5 sm:px-3 sm:py-3'}`}>Status</th>
                                            <th className={`text-center text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap ${isMinimized ? 'px-3 py-3' : 'px-2 py-2.5 sm:px-3 sm:py-3'}`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tableLoading ? (
                                            Array.from({ length: itemsPerPage > 5 ? 5 : itemsPerPage }).map((_, index) => (
                                                <SkeletonRow key={index} />
                                            ))
                                        ) : staffData.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center">
                                                    <div className="flex flex-col items-center justify-center py-8">
                                                        <FiUsers className="w-16 h-16 text-gray-300 mb-4" />
                                                        <p className="text-gray-500 text-lg font-medium mb-2">No staff members found</p>
                                                        <p className="text-gray-400 text-sm mb-6">Try adjusting your search or filter to find what you're looking for</p>
                                                        <button
                                                            onClick={() => setShowCreateModal(true)}
                                                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm"
                                                        >
                                                            <FiPlus className="w-4 h-4 inline mr-2" />
                                                            Add New Staff
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            staffData.map((staff) => (
                                                <tr key={staff.username || staff.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className={tableCellPad}>
                                                        <AnimatedCheckbox
                                                            checked={selectedStaff.has(staff.username)}
                                                            onChange={() => handleStaffSelect(staff.username)}
                                                            ariaLabel={`Select ${staff.name}`}
                                                        />
                                                    </td>
                                                    <td className={tableCellPad}>
                                                        <div className="flex items-center gap-2 sm:gap-3 min-w-[10rem]">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                                                                <FiUser className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-gray-800 text-sm">
                                                                    {staff.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 font-medium">
                                                                    C/O: {staff.guardian_name}
                                                                </div>
                                                                <div className="text-xs text-gray-400 mt-1">
                                                                    {staff.designation}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={tableCellPad}>
                                                        <div className="space-y-1 min-w-[8rem]">
                                                            <div className="flex items-center gap-2 text-gray-800 text-sm font-medium">
                                                                <FiPhone className="w-3 h-3 text-gray-400" />
                                                                {staff.mobile}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                {staff.email}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`${tableCellPad} max-w-[12rem] sm:max-w-[14rem] lg:max-w-[16rem]`}>
                                                        {(() => {
                                                             const roleObj = roles.find(r => 
                                                                 (r.permission_role_id && staff.permission_role_id && String(r.permission_role_id).toLowerCase() === String(staff.permission_role_id).toLowerCase()) ||
                                                                 (r.name && staff.permission_role_id && String(r.name).toLowerCase() === String(staff.permission_role_id).toLowerCase())
                                                             );
                                                             const rolePerms = roleObj ? (roleObj.permissions || []) : [];
                                                            const customPerms = (staff.custom_permissions || []).filter(p => !rolePerms.includes(p));
                                                            const allPerms = [...rolePerms, ...customPerms];
                                                            const MAX_CHIPS = 4;
                                                            const visiblePerms = allPerms.slice(0, MAX_CHIPS);
                                                            const remaining = allPerms.length - MAX_CHIPS;
                                                            return (
                                                                <div className="space-y-1.5">
                                                                    {/* Role name badge */}
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                                                        roleObj
                                                                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                                                            : 'bg-gray-100 text-gray-500 border-gray-200'
                                                                    }`}>
                                                                        <FiShield className="w-3 h-3" />
                                                                        {roleObj ? roleObj.name : 'No Role'}
                                                                    </span>
                                                                    {/* Permission chips */}
                                                                    {allPerms.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {visiblePerms.map(perm => {
                                                                                const isCustom = customPerms.includes(perm);
                                                                                return (
                                                                                    <span
                                                                                        key={perm}
                                                                                        title={perm}
                                                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                                                                            isCustom
                                                                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                                                        }`}
                                                                                    >
                                                                                        {getPermLabel(perm)}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                            {remaining > 0 && (
                                                                                <span
                                                                                    title={allPerms.slice(MAX_CHIPS).map(getPermLabel).join(', ')}
                                                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 cursor-default"
                                                                                >
                                                                                    +{remaining} more
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {allPerms.length === 0 && (
                                                                        <span className="text-[10px] text-gray-400 italic">No permissions assigned</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className={tableCellPad}>
                                                        <button
                                                            onClick={() => handleStatusChange(staff.username, !staff.is_active)}
                                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                                                staff.is_active 
                                                                    ? 'bg-green-500' 
                                                                    : 'bg-gray-300'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                    staff.is_active 
                                                                        ? 'translate-x-6' 
                                                                        : 'translate-x-1'
                                                                }`}
                                                            />
                                                        </button>
                                                    </td>
                                                    <td className={tableCellPad}>
                                                        <div className="flex justify-center items-center">
                                                            <button
                                                                type="button"
                                                                data-staff-actions-trigger
                                                                onClick={(e) => openActionsFromButton(e, staff.username)}
                                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Actions"
                                                                aria-label="Staff actions"
                                                            >
                                                                <FiMenu className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <TablePagination
                                page={currentPage}
                                limit={itemsPerPage}
                                total={totalItems}
                                totalPages={totalPages}
                                rowOptions={[5, 10, 20, 50, 100]}
                                defaultRows={10}
                                onPageChange={handlePageChange}
                                onLimitChange={handleLimitChange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create New Staff"
                subtitle="Add a new staff member to the system"
                size="xl"
                bodyClassName="p-6"
                footer={
                    <div className="flex justify-end gap-3">
                        <motion.button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="px-6 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 text-gray-700"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            type="submit"
                            form="create-staff-form"
                            disabled={loading}
                            className="px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {loading ? 'Creating...' : 'Create Staff'}
                        </motion.button>
                    </div>
                }
            >
                <form id="create-staff-form" onSubmit={handleCreateStaff}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newStaff.name}
                                            onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            placeholder="Enter full name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Guardian's Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newStaff.guardian_name}
                                            onChange={(e) => setNewStaff({...newStaff, guardian_name: e.target.value})}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            placeholder="Enter guardian's name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mobile Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={newStaff.mobile}
                                            onChange={(e) => setNewStaff({...newStaff, mobile: e.target.value})}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            placeholder="Enter mobile number"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={newStaff.email}
                                            onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            placeholder="Enter email address"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Designation
                                        </label>
                                        <select
                                            value={newStaff.designation}
                                            onChange={(e) => setNewStaff({...newStaff, designation: e.target.value})}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            required
                                        >
                                            <option value="">Select Designation</option>
                                            {designations.map(designation => (
                                                <option key={designation.value} value={designation.value}>
                                                    {designation.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Permission Level
                                        </label>
                                        <select
                                            value={newStaff.permission_id}
                                            onChange={(e) => setNewStaff({...newStaff, permission_id: e.target.value})}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                            required
                                        >
                                            <option value="">Select Permission</option>
                                            {roles.map(role => (
                                                <option key={role.permission_role_id} value={role.permission_role_id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                    </div>
                </form>
            </Modal>
            <Modal
                isOpen={showPermissionModal && !!selectedStaffMember}
                onClose={() => setShowPermissionModal(false)}
                title={`Change Permission: ${selectedStaffMember?.name || ''}`}
                subtitle="Assign role and manage custom permission overrides"
                size="2xl"
                bodyClassName="px-5 py-4"
                footer={
                    !modalLoading ? (
                        <div className="flex justify-end gap-3">
                            <motion.button
                                type="button"
                                onClick={() => setShowPermissionModal(false)}
                                className="px-6 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 text-gray-700"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                type="submit"
                                form="staff-permission-form"
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm disabled:opacity-50"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {loading ? 'Saving...' : 'Save Permissions'}
                            </motion.button>
                        </div>
                    ) : null
                }
            >
                {modalLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-12">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 font-medium">Loading user permissions...</p>
                    </div>
                ) : (
                    <form id="staff-permission-form" onSubmit={handleAssignPermissions} className="space-y-6">                                    {/* Role Dropdown */}
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                        <label className="block text-sm font-bold text-indigo-900 mb-2">
                                            Assign Role
                                        </label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="w-full md:w-1/2 px-3 py-2.5 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-white text-gray-700 font-medium"
                                        >
                                            <option value="">No Role (Custom Overrides Only)</option>
                                            {roles.map(role => (
                                                <option key={role.permission_role_id} value={role.permission_role_id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-indigo-600 mt-2">
                                            Selecting a role automatically grants its associated permissions (shown below). Additional permissions can be checked as custom overrides.
                                        </p>
                                    </div>

                                    {/* Selected Custom Permissions Table (Shown when no role is selected and custom overrides are present) */}
                                    {!selectedRole && customPermissions.length > 0 && (
                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
                                            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                                Selected Custom Permissions ({customPermissions.length})
                                            </h4>
                                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Permission Name</th>
                                                            <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                                            <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Key</th>
                                                            <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {customPermissions.map(permKey => {
                                                            const name = getPermLabel(permKey);
                                                            const category = getCategoryName(permKey);
                                                            return (
                                                                <tr key={permKey} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-4 py-2 text-sm font-semibold text-gray-800">{name}</td>
                                                                    <td className="px-4 py-2 text-xs">
                                                                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                            {category}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-xs font-mono text-gray-500">{permKey}</td>
                                                                    <td className="px-4 py-2 text-sm text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleCustomPermission(permKey)}
                                                                            className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Select All Toggle */}
                                    <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                                        <div className="space-y-0.5">
                                            <span className="text-sm font-bold text-gray-800">Grant All Permissions</span>
                                            <p className="text-xs text-gray-500">Enable all custom permissions at once as overrides</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const allOptionIds = permissionOptions.map(o => o.p_option_id);
                                                const isAllChecked = allOptionIds.every(id => customPermissions.includes(id));
                                                if (isAllChecked) {
                                                    setCustomPermissions([]);
                                                } else {
                                                    setCustomPermissions(allOptionIds);
                                                }
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                permissionOptions.length > 0 && permissionOptions.every(o => customPermissions.includes(o.p_option_id))
                                                    ? 'bg-indigo-600'
                                                    : 'bg-gray-300'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    permissionOptions.length > 0 && permissionOptions.every(o => customPermissions.includes(o.p_option_id))
                                                        ? 'translate-x-6'
                                                        : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Permissions Checklist */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Resolved Permissions</h3>
                                        <div className="space-y-3">
                                            {Object.keys(getGroupedOptions()).map(category => {
                                                const isExpanded = !!expandedCategories[category];
                                                const options = getGroupedOptions()[category] || [];
                                                const checkedCount = options.filter(o => 
                                                    getRolePermissions(selectedRole).includes(o.p_option_id) || 
                                                    customPermissions.includes(o.p_option_id)
                                                ).length;
                                                
                                                return (
                                                    <div key={category} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                                            className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100 hover:bg-gray-100/70 transition-colors text-left"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-indigo-900 font-sans">{category}</span>
                                                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                                                                    {checkedCount} / {options.length} Enabled
                                                                </span>
                                                            </div>
                                                            <span className="text-gray-500 font-semibold text-xs">
                                                                {isExpanded ? 'Collapse' : 'Expand'}
                                                            </span>
                                                        </button>
                                                        {isExpanded && (
                                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-white border-t border-gray-100">
                                                                {options.map(option => {
                                                                    const isInherited = getRolePermissions(selectedRole).includes(option.p_option_id);
                                                                    const isChecked = isInherited || customPermissions.includes(option.p_option_id);
                                                                    
                                                                    return (
                                                                        <div 
                                                                            key={option.p_option_id} 
                                                                            className={`border rounded-lg p-3 flex flex-col justify-between transition-all duration-200 ${
                                                                                isInherited 
                                                                                    ? 'bg-indigo-50/50 border-indigo-200' 
                                                                                    : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center justify-between mb-1.5">
                                                                                <span className="text-xs font-semibold text-gray-700">
                                                                                    {option.name}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isInherited}
                                                                                    onClick={() => toggleCustomPermission(option.p_option_id)}
                                                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                                                        isChecked 
                                                                                            ? (isInherited ? 'bg-indigo-500 cursor-not-allowed' : 'bg-green-500')
                                                                                            : 'bg-gray-300'
                                                                                    }`}
                                                                                >
                                                                                    <span
                                                                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                                                            isChecked 
                                                                                                ? 'translate-x-5' 
                                                                                                : 'translate-x-1'
                                                                                        }`}
                                                                                    />
                                                                                </button>
                                                                            </div>
                                                                            <div className="flex justify-between items-center mt-1">
                                                                                <span className="text-[10px] text-gray-500 truncate max-w-[70%]" title={option.remark}>
                                                                                    {option.remark || ''}
                                                                                </span>
                                                                                {isInherited && (
                                                                                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-bold uppercase">
                                                                                        Inherited
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                    </form>
                )}
            </Modal>

            <Modal
                isOpen={exportModal.open}
                onClose={() => setExportModal({ open: false, type: '', data: null })}
                title={`Exporting ${exportModal.type ? exportModal.type.toUpperCase() : ''}`}
                subtitle={`Your ${exportModal.type || 'file'} export is being processed...`}
                size="sm"
                bodyClassName="p-6"
            >
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PiExportBold className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="flex justify-center space-x-3">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                </div>
            </Modal>

            <AnimatePresence>
                {selectedStaff.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-6 right-6 z-[10030] w-[min(100vw-2rem,22rem)] rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl shadow-indigo-200/40"
                    >
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <p className="text-sm font-bold text-gray-900">
                                    {selectedStaff.size} staff selected
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Apply a permission role to all selected staff
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStaff(new Set());
                                    setBulkPermissionRole('');
                                }}
                                className="text-xs font-medium text-gray-500 hover:text-gray-800"
                            >
                                Clear
                            </button>
                        </div>
                        <select
                            value={bulkPermissionRole}
                            onChange={(e) => setBulkPermissionRole(e.target.value)}
                            className="w-full mb-3 px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Select permission role</option>
                            {roles.map((role) => (
                                <option key={role.permission_role_id} value={role.permission_role_id}>
                                    {role.name}{role.is_global ? ' (Global)' : ''}
                                </option>
                            ))}
                        </select>
                        <motion.button
                            type="button"
                            onClick={handleBulkAssignPermissions}
                            disabled={bulkAssigning || !bulkPermissionRole}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-semibold transition-colors"
                            whileTap={{ scale: 0.98 }}
                        >
                            <FiShield className="w-4 h-4" />
                            {bulkAssigning ? 'Updating...' : 'Change Permission'}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {activeRowDropdown && activeStaffForMenu && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        data-staff-actions-menu
                        className="fixed z-[99999] w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                        style={{
                            top: dropdownPos.top,
                            bottom: dropdownPos.bottom,
                            right: dropdownPos.right,
                            left: dropdownPos.left,
                            minWidth: ACTIONS_MENU_WIDTH,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setActiveRowDropdown(null);
                                actionAnchorRef.current = null;
                                navigate(`/view-stuff-profile?username=${activeStaffForMenu.username}`);
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-indigo-50"
                        >
                            <FiEye className="w-4 h-4 mr-2 text-indigo-600" />
                            View Profile
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveRowDropdown(null);
                                actionAnchorRef.current = null;
                                openPermissionModal(activeStaffForMenu);
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-indigo-50"
                        >
                            <FiShield className="w-4 h-4 mr-2 text-green-600" />
                            Change Permission
                        </button>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default StaffList;