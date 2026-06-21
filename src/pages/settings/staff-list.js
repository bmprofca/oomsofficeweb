import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiUsers,
    FiPlus,
    FiEye,
    FiShield,
    FiEdit,
    FiSearch,
    FiFilter,
    FiTrash2,
    FiMail,
    FiDownload,
    FiPrinter,
    FiX,
    FiUser,
    FiPhone,
    FiUserCheck,
    FiUserX,
    FiChevronLeft,
    FiChevronRight,
    FiMenu
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

const StaffList = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedPermission, setSelectedPermission] = useState('');
    const [selectedStaff, setSelectedStaff] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
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
    const [expandedCategories, setExpandedCategories] = useState({});

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageJumpInput, setPageJumpInput] = useState('');
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
        recurring_task_create: 'Recurring Create',
        recurring_task_delete: 'Recurring Delete',
        recurring_task_complete: 'Recurring Complete',
        recurring_task_fees_view: 'Recurring Fees'
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
                setPermissionOptions(res.data.data || []);
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

    const fetchStaffData = async (search = '', page = 1, limit = 10, isInitial = false) => {
        if (isInitial) {
            setLoading(true);
        } else {
            setTableLoading(true);
        }
        const headers = getHeaders();
        if (!headers) {
            setLoading(false);
            setTableLoading(false);
            return;
        }
        try {
            const encodedSearch = encodeURIComponent(search.trim());
            const res = await axios.get(
                `${API_BASE_URL}/settings/staff/list?search=${encodedSearch}&page=${page}&limit=${limit}`,
                { headers }
            );
            if (res.data?.success && res.data.data) {
                setStaffData(transformStaffData(res.data.data));
                const meta = res.data.meta || {};
                const total = meta.total ?? 0;
                setTotalItems(total);
                setTotalPages(Math.max(1, meta.total_pages ?? Math.ceil(total / limit)));
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
            setLoading(false);
            setTableLoading(false);
        }
    };

    const isSearchEffectMount = useRef(true);
    const isPageEffectMount = useRef(true);

    useEffect(() => {
        fetchStaffData('', 1, itemsPerPage, true);
        fetchRoles();
        fetchPermissionOptions();
    }, []);

    useEffect(() => {
        if (isPageEffectMount.current) { isPageEffectMount.current = false; return; }
        fetchStaffData(searchQuery, currentPage, itemsPerPage);
    }, [currentPage, itemsPerPage]);

    useEffect(() => {
        if (isSearchEffectMount.current) { isSearchEffectMount.current = false; return; }
        const t = setTimeout(() => {
            setCurrentPage(1);
            fetchStaffData(searchQuery, 1, itemsPerPage);
        }, 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

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
            if (!event.target.closest('.action-dropdown-container')) {
                setActiveRowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Filter staff based on status & permission dropdowns locally
    const filteredStaff = staffData.filter(staff => {
        const matchesStatus = selectedStatus === '' || 
            (selectedStatus === 'active' && staff.is_active) ||
            (selectedStatus === 'inactive' && !staff.is_active);

        const matchesPermission = selectedPermission === '' || 
            (staff.permission_role_id && (
                String(staff.permission_role_id).toLowerCase() === String(selectedPermission).toLowerCase() ||
                (() => {
                    const selectedRoleObj = roles.find(r => String(r.permission_role_id).toLowerCase() === String(selectedPermission).toLowerCase());
                    if (!selectedRoleObj) return false;
                    return String(staff.permission_role_id).toLowerCase() === String(selectedRoleObj.permission_role_id).toLowerCase() ||
                           String(staff.permission_role_id).toLowerCase() === String(selectedRoleObj.name).toLowerCase();
                })()
            ));

        return matchesStatus && matchesPermission;
    });

    // Handle staff selection
    const handleStaffSelect = (staffId) => {
        const newSelected = new Set(selectedStaff);
        if (newSelected.has(staffId)) {
            newSelected.delete(staffId);
        } else {
            newSelected.add(staffId);
        }
        setSelectedStaff(newSelected);
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedStaff(new Set());
        } else {
            const allStaffIds = new Set(filteredStaff.map(staff => staff.id));
            setSelectedStaff(allStaffIds);
        }
        setSelectAll(!selectAll);
    };

    const handlePageChange = (newPage) => {
        const page = Math.max(1, Math.min(totalPages, Math.floor(newPage)));
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setPageJumpInput('');
        }
    };

    const handlePageJump = (e) => {
        e.preventDefault();
        const page = parseInt(pageJumpInput, 10);
        if (!isNaN(page)) handlePageChange(page);
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
                const responseData = res.data.data || res.data;
                const roleId = responseData.permission_role_id || '';
                setSelectedRole(roleId);
                
                let custom = [];
                if (responseData.custom_permissions) {
                    custom = responseData.custom_permissions;
                } else if (responseData.permissions) {
                    const inherited = getRolePermissions(roleId);
                    custom = responseData.permissions.filter(p => !inherited.includes(p) && p !== 'office_assistance_access');
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
                setShowPermissionModal(false);
                fetchStaffData(searchQuery, currentPage, itemsPerPage);
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

    // Handle delete staff (locally mocked since no API available)
    const handleDeleteStaff = (staffId) => {
        setStaffData(prev => prev.filter(staff => staff.id !== staffId));
        setDeleteModal(false);
        toast.success('Staff member deleted successfully');
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
    const SkeletonRow = () => (
        <tr className="animate-pulse">
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
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
            </td>
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-32"></div>
            </td>
            <td className="p-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
            </td>
            <td className="p-4">
                <div className="h-6 bg-gray-200 rounded w-11"></div>
            </td>
            <td className="p-4">
                <div className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
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
                                            Staff Management
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            {filteredStaff.length} of {staffData.length} staff members shown
                                        </p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                        {/* Search Input */}
                                        <div className="flex-1 relative min-w-[300px]">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search by name, mobile, email, or designation..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {/* Permission Filter */}
                                            <select
                                                value={selectedPermission}
                                                onChange={(e) => setSelectedPermission(e.target.value)}
                                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            >
                                                <option value="">All Permissions</option>
                                                {roles.map(role => (
                                                    <option key={role.permission_role_id} value={role.permission_role_id}>
                                                        {role.name}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Status Filter */}
                                            <select
                                                value={selectedStatus}
                                                onChange={(e) => setSelectedStatus(e.target.value)}
                                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            >
                                                <option value="">All Status</option>
                                                {statusOptions.map(status => (
                                                    <option key={status.value} value={status.value}>
                                                        {status.name}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Export Dropdown */}
                                            <div className="dropdown-container relative">
                                                <button
                                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                >
                                                    <PiExportBold className="w-4 h-4" />
                                                    Export
                                                </button>

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
                                                onClick={() => setShowCreateModal(true)}
                                                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Add Staff
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
                                            <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff</th>
                                            <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Permission</th>
                                            <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            // Skeleton Loaders
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <SkeletonRow key={index} />
                                            ))
                                        ) : filteredStaff.length === 0 ? (
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
                                            filteredStaff.map((staff) => (
                                                <tr key={staff.username || staff.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStaff.has(staff.username)}
                                                            onChange={() => handleStaffSelect(staff.username)}
                                                            className="w-4 h-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
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
                                                    <td className="p-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-gray-800 text-sm font-medium">
                                                                <FiPhone className="w-3 h-3 text-gray-400" />
                                                                {staff.mobile}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                {staff.email}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 max-w-[240px]">
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
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => handleStatusChange(staff.username, !staff.is_active)}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
                                                    <td className="p-4 relative">
                                                        <div className="flex justify-center items-center action-dropdown-container">
                                                            <button
                                                                onClick={() => setActiveRowDropdown(activeRowDropdown === staff.username ? null : staff.username)}
                                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Actions"
                                                            >
                                                                <FiMenu className="w-4 h-4" />
                                                            </button>
                                                            {activeRowDropdown === staff.username && (
                                                                <div className={`absolute right-4 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden py-1 text-left ${
                                                                    filteredStaff.indexOf(staff) >= filteredStaff.length - 2 && filteredStaff.length > 2
                                                                        ? 'bottom-full mb-1'
                                                                        : 'top-full mt-1'
                                                                }`}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveRowDropdown(null);
                                                                            navigate(`/view-stuff-profile?username=${staff.username}`);
                                                                        }}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                                    >
                                                                        <FiEye className="w-4 h-4 mr-2 text-indigo-600" />
                                                                        View Profile
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveRowDropdown(null);
                                                                            openPermissionModal(staff);
                                                                        }}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                                    >
                                                                        <FiShield className="w-4 h-4 mr-2 text-green-600" />
                                                                        Change Permission
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveRowDropdown(null);
                                                                            setSelectedStaffMember(staff);
                                                                            setDeleteModal(true);
                                                                        }}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                                    >
                                                                        <FiTrash2 className="w-4 h-4 mr-2 text-red-600" />
                                                                        Delete Staff
                                                                    </button>
                                                                </div>
                                                            )}
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
                                     <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                         <div className="flex items-center gap-4">
                                             <span className="font-semibold text-gray-800 text-sm">
                                                 Showing {filteredStaff.length} of {totalItems} staff members
                                             </span>
                                             <select
                                                 value={itemsPerPage}
                                                 onChange={(e) => {
                                                     setItemsPerPage(Number(e.target.value));
                                                     setCurrentPage(1);
                                                 }}
                                                 className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-medium"
                                             >
                                                 {[5, 10, 20, 50, 100].map(opt => (
                                                     <option key={opt} value={opt}>{opt} per page</option>
                                                 ))}
                                             </select>
                                         </div>
                                         
                                         <div className="flex gap-3 items-center flex-wrap justify-center">
                                             <div className="text-sm text-gray-600 mr-2">
                                                 {selectedStaff.size} staff selected
                                             </div>
                                             
                                             {/* Pagination controls */}
                                             <div className="flex items-center bg-white border border-gray-300 rounded-lg p-0.5 shadow-sm">
                                                 <button
                                                     type="button"
                                                     onClick={() => handlePageChange(currentPage - 1)}
                                                     disabled={currentPage === 1}
                                                     className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 rounded-l-md transition-colors"
                                                 >
                                                     <FiChevronLeft className="w-4 h-4" />
                                                 </button>
                                                 <span className="px-4 text-xs font-semibold text-gray-700">
                                                     Page {currentPage} of {totalPages}
                                                 </span>
                                                 <button
                                                     type="button"
                                                     onClick={() => handlePageChange(currentPage + 1)}
                                                     disabled={currentPage === totalPages}
                                                     className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 rounded-r-md transition-colors"
                                                 >
                                                     <FiChevronRight className="w-4 h-4" />
                                                 </button>
                                             </div>

                                             <form onSubmit={handlePageJump} className="flex items-center gap-1.5">
                                                 <input
                                                     type="number"
                                                     min="1"
                                                     max={totalPages}
                                                     value={pageJumpInput}
                                                     onChange={(e) => setPageJumpInput(e.target.value)}
                                                     placeholder="Go to"
                                                     className="w-16 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                                 />
                                                 <button type="submit" className="hidden" />
                                             </form>
                                         </div>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Staff Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Create New Staff</h2>
                                <p className="text-indigo-100 text-sm mt-1">Add a new staff member to the system</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateStaff}>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
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
                                    {loading ? 'Creating...' : 'Create Staff'}
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Permission Modal */}
            {showPermissionModal && selectedStaffMember && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                        onClick={() => setShowPermissionModal(false)}
                    />
                    
                    {/* Modal Panel */}
                    <div className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-3.5 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold">Change Permission: {selectedStaffMember.name}</h2>
                                <p className="text-indigo-100 text-sm mt-1">Assign role and manage custom permission overrides</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPermissionModal(false)}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        {modalLoading ? (
                            <div className="p-12 flex flex-col items-center justify-center space-y-4 flex-1">
                                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-medium">Loading user permissions...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleAssignPermissions} className="flex flex-col flex-1 overflow-hidden">
                                <div 
                                    className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-6"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {/* Role Dropdown */}
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
                                </div>
                                <div className="border-t px-5 py-3 bg-gray-50 flex justify-end gap-3 shrink-0">
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
                                        disabled={loading}
                                        className="px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {loading ? 'Saving...' : 'Save Permissions'}
                                    </motion.button>
                                </div>
                            </form>
                        )}
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

            {deleteModal && selectedStaffMember && (
                <DeleteConfirmationModal
                    title={`Delete ${selectedStaffMember.name}`}
                    message={`Are you sure you want to delete ${selectedStaffMember.name}? This action cannot be undone.`}
                    onConfirm={(res) => {
                        if (res.confirmed) {
                            handleDeleteStaff(selectedStaffMember.id);
                        }
                        setDeleteModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default StaffList;