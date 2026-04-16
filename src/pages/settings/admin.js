import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '../../components/header';
import {
    FiPlus,
    FiEdit,
    FiUser,
    FiMail,
    FiPhone,
    FiShield,
    FiKey,
    FiSearch,
    FiTrash2,
    FiDownload,
    FiPrinter,
    FiMail as FiMailIcon,
    FiCheckCircle,
    FiXCircle,
    FiX,
    FiRefreshCw,
    FiLock,
    FiEye,
    FiEyeOff
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import DeleteConfirmationModal from '../../components/delete-confirmation';

const ViewAdmins = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [adminData, setAdminData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedAdmins, setSelectedAdmins] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        mobile: '',
        password: '',
        confirm_password: '',
        status: 1
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

    // Mock data
    const [adminDataState, setAdminDataState] = useState([
        {
            id: '1',
            username: 'admin001',
            name: 'Rajesh Kumar',
            email: 'rajesh@company.com',
            mobile: '+91 9876543210',
            password: 'password123',
            status: 1,
            created_date: '2024-01-15',
            last_login: '2024-12-01',
            role: 'Super Admin'
        },
        {
            id: '2',
            username: 'admin002',
            name: 'Priya Sharma',
            email: 'priya@company.com',
            mobile: '+91 9876543211',
            password: 'securepass456',
            status: 1,
            created_date: '2024-01-10',
            last_login: '2024-12-01',
            role: 'Admin'
        },
        {
            id: '3',
            username: 'admin003',
            name: 'Amit Singh',
            email: 'amit@company.com',
            mobile: '+91 9876543212',
            password: 'adminpass789',
            status: 0,
            created_date: '2024-01-05',
            last_login: '2024-11-30',
            role: 'Admin'
        },
        {
            id: '4',
            username: 'admin004',
            name: 'Sneha Patel',
            email: 'sneha@company.com',
            mobile: '+91 9876543213',
            password: 'snehapass012',
            status: 1,
            created_date: '2024-01-20',
            last_login: '2024-11-30',
            role: 'Manager'
        },
        {
            id: '5',
            username: 'admin005',
            name: 'Rahul Verma',
            email: 'rahul@company.com',
            mobile: '+91 9876543214',
            password: 'rahulpass345',
            status: 1,
            created_date: '2024-01-18',
            last_login: '2024-11-29',
            role: 'Viewer'
        }
    ]);

    // Load initial data
    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        setTimeout(() => {
            setAdminData(adminDataState);
            setLoading(false);
        }, 1000);
    };

    // Filter admins based on search and filters
    const filteredAdmins = adminData.filter(admin => {
        const matchesSearch = searchQuery === '' ||
            admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            admin.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            admin.mobile.includes(searchQuery) ||
            admin.role.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = selectedStatus === '' || 
            (selectedStatus === 'active' && admin.status === 1) ||
            (selectedStatus === 'inactive' && admin.status === 0);

        return matchesSearch && matchesStatus;
    });

    // Handle admin selection
    const handleAdminSelect = (adminId) => {
        const newSelected = new Set(selectedAdmins);
        if (newSelected.has(adminId)) {
            newSelected.delete(adminId);
        } else {
            newSelected.add(adminId);
        }
        setSelectedAdmins(newSelected);
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedAdmins(new Set());
        } else {
            const allAdminIds = new Set(filteredAdmins.map(admin => admin.id));
            setSelectedAdmins(allAdminIds);
        }
        setSelectAll(!selectAll);
    };

    // Handle input change for forms
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            username: '',
            name: '',
            email: '',
            mobile: '',
            password: '',
            confirm_password: '',
            status: 1
        });
        setShowPassword(false);
    };

    // Handle add admin
    const handleAddAdmin = async (e) => {
        e.preventDefault();
        
        // Validate password match
        if (formData.password !== formData.confirm_password) {
            alert('Passwords do not match!');
            return;
        }
        
        setLoading(true);
        
        setTimeout(() => {
            const newAdmin = {
                id: `${adminData.length + 1}`,
                username: formData.username,
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                password: formData.password,
                status: formData.status,
                created_date: new Date().toISOString().split('T')[0],
                last_login: null,
                role: 'Admin'
            };
            
            setAdminData(prev => [newAdmin, ...prev]);
            resetForm();
            setShowAddModal(false);
            setLoading(false);
            
            alert('Admin added successfully!');
        }, 1000);
    };

    // Handle edit admin
    const handleEditAdmin = async (e) => {
        e.preventDefault();
        
        // Validate password if changed
        if (formData.password && formData.password !== formData.confirm_password) {
            alert('Passwords do not match!');
            return;
        }
        
        setLoading(true);
        
        setTimeout(() => {
            setAdminData(prev => prev.map(admin => 
                admin.id === selectedAdmin.id 
                    ? { 
                        ...admin,
                        name: formData.name,
                        email: formData.email,
                        mobile: formData.mobile,
                        password: formData.password || admin.password,
                        status: formData.status
                    }
                    : admin
            ));
            
            setShowEditModal(false);
            setLoading(false);
            alert('Admin updated successfully!');
        }, 1000);
    };

    // Handle delete admin
    const handleDeleteAdmin = (adminId) => {
        setAdminData(prev => prev.filter(admin => admin.id !== adminId));
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

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Open add modal
    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    // Open edit modal
    const openEditModal = (admin) => {
        setSelectedAdmin(admin);
        setFormData({
            username: admin.username,
            name: admin.name,
            email: admin.email,
            mobile: admin.mobile,
            password: '',
            confirm_password: '',
            status: admin.status
        });
        setShowPassword(false);
        setShowEditModal(true);
    };

    // Toggle status
    const toggleStatus = () => {
        setFormData(prev => ({
            ...prev,
            status: prev.status === 1 ? 0 : 1
        }));
    };

    const getStatusBadge = (status) => {
        return status === 1 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <FiCheckCircle className="w-3 h-3 mr-1" />
                Active
            </span>
        ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                <FiXCircle className="w-3 h-3 mr-1" />
                Inactive
            </span>
        );
    };

    const getRoleBadge = (role) => {
        const colors = {
            'Super Admin': 'bg-purple-100 text-purple-800 border-purple-200',
            'Admin': 'bg-blue-100 text-blue-800 border-blue-200',
            'Manager': 'bg-green-100 text-green-800 border-green-200',
            'Viewer': 'bg-gray-100 text-gray-800 border-gray-200'
        };
        
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                {role}
            </span>
        );
    };

    const maskPassword = (password) => {
        return '•'.repeat(Math.min(password.length, 10));
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className="p-4">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-2 bg-gray-200 rounded w-16"></div>
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
                <div className="h-6 bg-gray-200 rounded w-20"></div>
            </td>
            <td className="p-4">
                <div className="h-3 bg-gray-200 rounded w-24"></div>
            </td>
            <td className="p-4">
                <div className="flex gap-2 justify-center">
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
                                            Admin Management
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            {filteredAdmins.length} of {adminData.length} admin users shown
                                        </p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                        {/* Search Input */}
                                        <div className="flex-1 relative min-w-[300px]">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search by name, email, username, or role..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {/* Status Filter */}
                                            <select
                                                value={selectedStatus}
                                                onChange={(e) => setSelectedStatus(e.target.value)}
                                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
                                            >
                                                <option value="">All Status</option>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>

                                            {/* Export Dropdown */}
                                            <div className="dropdown-container relative">
                                                <motion.button
                                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
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
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                                            >
                                                                <PiFilePdfDuotone className="w-4 h-4 mr-3 text-red-500" />
                                                                Export as PDF
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('excel')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                                            >
                                                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-3 text-green-500" />
                                                                Export as Excel
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('whatsapp')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                                            >
                                                                <FaWhatsapp className="w-4 h-4 mr-3 text-green-500" />
                                                                Share via WhatsApp
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('email')}
                                                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                                            >
                                                                <AiOutlineMail className="w-4 h-4 mr-3 text-blue-500" />
                                                                Share via Email
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <motion.button
                                                onClick={openAddModal}
                                                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Create Admin
                                            </motion.button>

                                            <motion.button
                                                onClick={() => fetchAdminData()}
                                                className="px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiRefreshCw className="w-4 h-4" />
                                                Refresh
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
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-400 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">#</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Admin Details</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Contact Information</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Credentials</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status & Role</th>
                                            <th className="text-center p-4 font-semibold text-gray-700 text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            // Skeleton Loaders
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <SkeletonRow key={index} />
                                            ))
                                        ) : filteredAdmins.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center">
                                                    <div className="flex flex-col items-center justify-center py-8">
                                                        <FiShield className="w-16 h-16 text-gray-300 mb-4" />
                                                        <p className="text-gray-500 text-lg font-medium mb-2">No admin users found</p>
                                                        <p className="text-gray-400 text-sm mb-6">Try adjusting your search or create a new admin</p>
                                                        <motion.button
                                                            onClick={openAddModal}
                                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <FiPlus className="w-4 h-4 inline mr-2" />
                                                            Create New Admin
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAdmins.map((admin, index) => (
                                                <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAdmins.has(admin.id)}
                                                            onChange={() => handleAdminSelect(admin.id)}
                                                            className="w-4 h-4 text-blue-600 rounded border-gray-400 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 font-medium">
                                                        {index + 1}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                                                <FiUser className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-gray-800 text-sm">
                                                                    {admin.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    @{admin.username}
                                                                </div>
                                                                <div className="text-xs text-gray-400 mt-1">
                                                                    Created: {formatDate(admin.created_date)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                                <FiMail className="w-3 h-3 text-gray-400" />
                                                                {admin.email}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                                <FiPhone className="w-3 h-3 text-gray-400" />
                                                                {admin.mobile}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <FiKey className="w-3 h-3 text-gray-400" />
                                                                <code className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                                                    {maskPassword(admin.password)}
                                                                </code>
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Last login: {formatDate(admin.last_login)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-2">
                                                            <div>
                                                                {getStatusBadge(admin.status)}
                                                            </div>
                                                            <div className="mt-2">
                                                                {getRoleBadge(admin.role)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <motion.button
                                                                onClick={() => openEditModal(admin)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit Admin"
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                            >
                                                                <FiEdit className="w-4 h-4" />
                                                            </motion.button>
                                                            <motion.button
                                                                onClick={() => {
                                                                    setSelectedAdmin(admin);
                                                                    setDeleteModal(true);
                                                                }}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Admin"
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </motion.button>
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
                                            Showing {filteredAdmins.length} of {adminData.length} admin users
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            <div className="text-sm text-gray-600 mr-4">
                                                {selectedAdmins.size} admin(s) selected
                                            </div>
                                            <motion.button
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedAdmins.size === 0}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiMailIcon className="w-4 h-4" />
                                                Send Message
                                            </motion.button>
                                            <motion.button
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedAdmins.size === 0}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiDownload className="w-4 h-4" />
                                                Export Selected
                                            </motion.button>
                                            <motion.button
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiPrinter className="w-4 h-4" />
                                                Print All
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Admin Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Create New Admin</h2>
                                <p className="text-green-100 text-sm mt-1">Add a new administrative user</p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-white hover:text-green-200 transition-colors duration-200 p-1 rounded-lg hover:bg-green-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddAdmin}>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiUser className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            placeholder="Enter full name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiShield className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => handleInputChange('username', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            placeholder="Enter username"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiMail className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            placeholder="admin@company.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiPhone className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Mobile Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.mobile}
                                            onChange={(e) => handleInputChange('mobile', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            placeholder="+91 9876543210"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                                            <FiLock className="w-4 h-4 text-blue-600" />
                                            Password Settings
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.password}
                                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 pr-10"
                                                        placeholder="Enter password"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Confirm Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.confirm_password}
                                                        onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 pr-10"
                                                        placeholder="Confirm password"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 text-xs text-gray-500">
                                            <p>• Password must be at least 8 characters long</p>
                                            <p>• Include uppercase and lowercase letters</p>
                                            <p>• Include at least one number and special character</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-sm font-medium text-gray-700">
                                            Account Status
                                        </label>
                                        <button
                                            type="button"
                                            onClick={toggleStatus}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                formData.status === 1 
                                                    ? 'bg-green-500' 
                                                    : 'bg-gray-300'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    formData.status === 1 
                                                        ? 'translate-x-6' 
                                                        : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    <div className="text-center">
                                        <span className={`text-sm font-medium ${formData.status === 1 ? 'text-green-700' : 'text-red-700'}`}>
                                            {formData.status === 1 ? 'Active Account' : 'Inactive Account'}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formData.status === 1 
                                                ? 'Admin can login and access the system'
                                                : 'Admin cannot login to the system'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:shadow-sm text-gray-700"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiPlus className="w-4 h-4" />
                                    {loading ? 'Creating...' : 'Create Admin'}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {showEditModal && selectedAdmin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Edit Admin</h2>
                                <p className="text-blue-100 text-sm mt-1">Update admin information</p>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-white hover:text-blue-200 transition-colors duration-200 p-1 rounded-lg hover:bg-blue-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditAdmin}>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                        <FiUser className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <div className="font-semibold text-gray-800">
                                                {selectedAdmin?.name}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                Username: @{selectedAdmin?.username}
                                            </div>
                                        </div>
                                        <div className="ml-auto">
                                            {getStatusBadge(selectedAdmin?.status)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiUser className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiShield className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 transition-all duration-200"
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiMail className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiPhone className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Mobile Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.mobile}
                                            onChange={(e) => handleInputChange('mobile', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                                            <FiLock className="w-4 h-4 text-blue-600" />
                                            Change Password (Optional)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    New Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.password}
                                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 pr-10"
                                                        placeholder="Leave blank to keep current"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Confirm Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.confirm_password}
                                                        onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 pr-10"
                                                        placeholder="Confirm new password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-sm font-medium text-gray-700">
                                            Account Status
                                        </label>
                                        <button
                                            type="button"
                                            onClick={toggleStatus}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                formData.status === 1 
                                                    ? 'bg-green-500' 
                                                    : 'bg-gray-300'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    formData.status === 1 
                                                        ? 'translate-x-6' 
                                                        : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    <div className="text-center">
                                        <span className={`text-sm font-medium ${formData.status === 1 ? 'text-green-700' : 'text-red-700'}`}>
                                            {formData.status === 1 ? 'Active Account' : 'Inactive Account'}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formData.status === 1 
                                                ? 'Admin can login and access the system'
                                                : 'Admin cannot login to the system'}
                                        </p>
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
                                    className="px-6 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiEdit className="w-4 h-4" />
                                    {loading ? 'Updating...' : 'Update Admin'}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
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
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteModal && selectedAdmin && (
                <DeleteConfirmationModal
                    title={`Delete ${selectedAdmin.name}`}
                    message={`Are you sure you want to delete the admin user "${selectedAdmin.name}"? This action cannot be undone and will remove all associated data.`}
                    onConfirm={(res) => {
                        if (res.confirmed) {
                            handleDeleteAdmin(selectedAdmin.id);
                        }
                        setDeleteModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default ViewAdmins;