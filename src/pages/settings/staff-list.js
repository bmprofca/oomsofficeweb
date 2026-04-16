import React, { useState, useEffect } from 'react';
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
    FiUserX
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import DeleteConfirmationModal from '../../components/delete-confirmation';

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

    // Mock data
    const [staffData, setStaffData] = useState([
        {
            id: '1',
            username: 'staff001',
            name: 'Rajesh Kumar',
            guardian_name: 'Suresh Kumar',
            mobile: '+91 9876543210',
            email: 'rajesh@company.com',
            password: '******',
            permission_name: 'Manager',
            permission_id: '2',
            status: 1,
            designation: 'Manager',
            created_date: '2024-01-15'
        },
        {
            id: '2',
            username: 'staff002',
            name: 'Priya Sharma',
            guardian_name: 'Ramesh Sharma',
            mobile: '+91 9876543211',
            email: 'priya@company.com',
            password: '******',
            permission_name: 'Supervisor',
            permission_id: '3',
            status: 1,
            designation: 'Supervisor',
            created_date: '2024-01-10'
        },
        {
            id: '3',
            username: 'staff003',
            name: 'Amit Singh',
            guardian_name: 'Vikram Singh',
            mobile: '+91 9876543212',
            email: 'amit@company.com',
            password: '******',
            permission_name: 'Staff',
            permission_id: '4',
            status: 0,
            designation: 'Accountant',
            created_date: '2024-01-05'
        },
        {
            id: '4',
            username: 'staff004',
            name: 'Sneha Patel',
            guardian_name: 'Ravi Patel',
            mobile: '+91 9876543213',
            email: 'sneha@company.com',
            password: '******',
            permission_name: 'Admin',
            permission_id: '1',
            status: 1,
            designation: 'Administrator',
            created_date: '2024-01-20'
        },
        {
            id: '5',
            username: 'staff005',
            name: 'Rahul Verma',
            guardian_name: 'Sanjay Verma',
            mobile: '+91 9876543214',
            email: 'rahul@company.com',
            password: '******',
            permission_name: 'Staff',
            permission_id: '4',
            status: 0,
            designation: 'Assistant',
            created_date: '2024-01-18'
        }
    ]);

    const permissions = [
        { permission_id: '1', name: 'Admin' },
        { permission_id: '2', name: 'Manager' },
        { permission_id: '3', name: 'Supervisor' },
        { permission_id: '4', name: 'Staff' }
    ];

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

    // Filter staff based on search and filters
    const filteredStaff = staffData.filter(staff => {
        const matchesSearch = searchQuery === '' ||
            staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            staff.mobile.includes(searchQuery) ||
            staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            staff.designation.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = selectedStatus === '' || 
            (selectedStatus === 'active' && staff.status === 1) ||
            (selectedStatus === 'inactive' && staff.status === 0);

        const matchesPermission = selectedPermission === '' || 
            staff.permission_id === selectedPermission;

        return matchesSearch && matchesStatus && matchesPermission;
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

    // Handle status change
    const handleStatusChange = async (staffId) => {
        setLoading(true);
        setTimeout(() => {
            setStaffData(prev => prev.map(staff => 
                staff.id === staffId 
                    ? { ...staff, status: staff.status === 1 ? 0 : 1 }
                    : staff
            ));
            setLoading(false);
        }, 500);
    };

    // Handle permission change
    const handlePermissionChange = async (staffId, permissionId) => {
        setLoading(true);
        setTimeout(() => {
            setStaffData(prev => prev.map(staff => 
                staff.id === staffId 
                    ? { 
                        ...staff, 
                        permission_id: permissionId,
                        permission_name: permissions.find(p => p.permission_id === permissionId)?.name
                    }
                    : staff
            ));
            setLoading(false);
            setShowPermissionModal(false);
        }, 500);
    };

    // Handle create staff
    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            const newStaffMember = {
                id: `${staffData.length + 1}`,
                username: `staff${Date.now()}`,
                ...newStaff,
                password: '******',
                permission_name: permissions.find(p => p.permission_id === newStaff.permission_id)?.name,
                status: 1,
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
        }, 1000);
    };

    // Handle delete staff
    const handleDeleteStaff = (staffId) => {
        setStaffData(prev => prev.filter(staff => staff.id !== staffId));
        setDeleteModal(false);
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });
        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
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

                                            {/* Permission Filter */}
                                            <select
                                                value={selectedPermission}
                                                onChange={(e) => setSelectedPermission(e.target.value)}
                                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                                            >
                                                <option value="">All Permissions</option>
                                                {permissions.map(permission => (
                                                    <option key={permission.permission_id} value={permission.permission_id}>
                                                        {permission.name}
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
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Staff</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Contact</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Permission</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                                            <th className="text-center p-4 font-semibold text-gray-700 text-sm">Actions</th>
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
                                                <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStaff.has(staff.id)}
                                                            onChange={() => handleStaffSelect(staff.id)}
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
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                            {staff.permission_name}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => handleStatusChange(staff.id)}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                                staff.status === 1 
                                                                    ? 'bg-green-500' 
                                                                    : 'bg-gray-300'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                    staff.status === 1 
                                                                        ? 'translate-x-6' 
                                                                        : 'translate-x-1'
                                                                }`}
                                                            />
                                                        </button>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <button
                                                                onClick={() => navigate(`/view-stuff-profile?username=${staff.username}`)}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title="View Profile"
                                                            >
                                                                <FiEye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedStaffMember(staff);
                                                                    setShowPermissionModal(true);
                                                                }}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Change Permission"
                                                            >
                                                                <FiShield className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedStaffMember(staff);
                                                                    setDeleteModal(true);
                                                                }}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Staff"
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
                                            Showing {filteredStaff.length} of {staffData.length} staff members
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            <div className="text-sm text-gray-600 mr-4">
                                                {selectedStaff.size} staff member(s) selected
                                            </div>
                                            <button
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-indigo-700 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedStaff.size === 0}
                                            >
                                                <FiMail className="w-4 h-4" />
                                                Send Message
                                            </button>
                                            <button
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-green-700 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedStaff.size === 0}
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
                                            {permissions.map(permission => (
                                                <option key={permission.permission_id} value={permission.permission_id}>
                                                    {permission.name}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Change Permission</h2>
                                <p className="text-indigo-100 text-sm mt-1">Update staff permission level</p>
                            </div>
                            <button
                                onClick={() => setShowPermissionModal(false)}
                                className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Permission Level
                                </label>
                                <select
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                                    onChange={(e) => handlePermissionChange(selectedStaffMember.id, e.target.value)}
                                >
                                    {permissions.map(permission => (
                                        <option 
                                            key={permission.permission_id} 
                                            value={permission.permission_id}
                                            selected={permission.permission_id === selectedStaffMember?.permission_id}
                                        >
                                            {permission.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
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