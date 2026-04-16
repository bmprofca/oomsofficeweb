import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '../../components/header';
import {
    FiPlus,
    FiEdit,
    FiPhone,
    FiMail,
    FiUser,
    FiSettings,
    FiSearch,
    FiFilter,
    FiTrash2,
    FiDownload,
    FiPrinter,
    FiMail as FiMailIcon,
    FiCheckCircle,
    FiXCircle,
    FiHome,
    FiStar,
    FiX,
    FiRefreshCw,
    FiMapPin,
    FiKey,
    FiGlobe
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import DeleteConfirmationModal from '../../components/delete-confirmation';

const ViewBranch = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [branchData, setBranchData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedBranches, setSelectedBranches] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        branch_id: '',
        mobile: '',
        email: '',
        address: '',
        status: 1,
        is_head: 0,
        admin_login_id: '',
        admin_password: ''
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
    const [branchDataState, setBranchDataState] = useState([
        {
            id: '1',
            branch_id: 'BR001',
            name: 'Main Branch',
            mobile: '+91 9876543210',
            email: 'main@company.com',
            address: '123 Main Street, City Center, Mumbai - 400001',
            status: 1,
            is_head: 1,
            created_date: '2024-01-15',
            admin: {
                login_id: 'admin_main',
                password: 'password123'
            }
        },
        {
            id: '2',
            branch_id: 'BR002',
            name: 'North Branch',
            mobile: '+91 9876543211',
            email: 'north@company.com',
            address: '456 North Avenue, North City, Delhi - 110001',
            status: 1,
            is_head: 0,
            created_date: '2024-01-10',
            admin: {
                login_id: 'admin_north',
                password: 'password456'
            }
        },
        {
            id: '3',
            branch_id: 'BR003',
            name: 'South Branch',
            mobile: '+91 9876543212',
            email: 'south@company.com',
            address: '789 South Road, South City, Chennai - 600001',
            status: 0,
            is_head: 0,
            created_date: '2024-01-05',
            admin: {
                login_id: 'admin_south',
                password: 'password789'
            }
        },
        {
            id: '4',
            branch_id: 'BR004',
            name: 'West Branch',
            mobile: '+91 9876543213',
            email: 'west@company.com',
            address: '101 West Street, West City, Ahmedabad - 380001',
            status: 1,
            is_head: 0,
            created_date: '2024-01-20',
            admin: {
                login_id: 'admin_west',
                password: 'password012'
            }
        },
        {
            id: '5',
            branch_id: 'BR005',
            name: 'East Branch',
            mobile: '+91 9876543214',
            email: 'east@company.com',
            address: '202 East Boulevard, East City, Kolkata - 700001',
            status: 1,
            is_head: 0,
            created_date: '2024-01-18',
            admin: {
                login_id: 'admin_east',
                password: 'password345'
            }
        }
    ]);

    // Load initial data
    useEffect(() => {
        fetchBranchData();
    }, []);

    const fetchBranchData = async () => {
        setLoading(true);
        setTimeout(() => {
            setBranchData(branchDataState);
            setLoading(false);
        }, 1000);
    };

    // Filter branches based on search and filters
    const filteredBranches = branchData.filter(branch => {
        const matchesSearch = searchQuery === '' ||
            branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            branch.mobile.includes(searchQuery) ||
            branch.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            branch.branch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            branch.address.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = selectedStatus === '' || 
            (selectedStatus === 'active' && branch.status === 1) ||
            (selectedStatus === 'inactive' && branch.status === 0);

        const matchesType = selectedType === '' || 
            (selectedType === 'main' && branch.is_head === 1) ||
            (selectedType === 'sub' && branch.is_head === 0);

        return matchesSearch && matchesStatus && matchesType;
    });

    // Handle branch selection
    const handleBranchSelect = (branchId) => {
        const newSelected = new Set(selectedBranches);
        if (newSelected.has(branchId)) {
            newSelected.delete(branchId);
        } else {
            newSelected.add(branchId);
        }
        setSelectedBranches(newSelected);
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedBranches(new Set());
        } else {
            const allBranchIds = new Set(filteredBranches.map(branch => branch.id));
            setSelectedBranches(allBranchIds);
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
            name: '',
            branch_id: '',
            mobile: '',
            email: '',
            address: '',
            status: 1,
            is_head: 0,
            admin_login_id: '',
            admin_password: ''
        });
    };

    // Handle add branch
    const handleAddBranch = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        setTimeout(() => {
            const newBranch = {
                id: `${branchData.length + 1}`,
                branch_id: formData.branch_id.toUpperCase(),
                name: formData.name,
                mobile: formData.mobile,
                email: formData.email,
                address: formData.address,
                status: formData.status,
                is_head: formData.is_head,
                created_date: new Date().toISOString().split('T')[0],
                admin: {
                    login_id: formData.admin_login_id,
                    password: formData.admin_password
                }
            };
            
            setBranchData(prev => [newBranch, ...prev]);
            resetForm();
            setShowAddModal(false);
            setLoading(false);
            
            alert('Branch added successfully!');
        }, 1000);
    };

    // Handle edit branch
    const handleEditBranch = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        setTimeout(() => {
            setBranchData(prev => prev.map(branch => 
                branch.id === selectedBranch.id 
                    ? { 
                        ...branch,
                        name: formData.name,
                        mobile: formData.mobile,
                        email: formData.email,
                        address: formData.address,
                        status: formData.status,
                        is_head: formData.is_head,
                        admin: {
                            ...branch.admin,
                            login_id: formData.admin_login_id,
                            password: formData.admin_password
                        }
                    }
                    : branch
            ));
            
            setShowEditModal(false);
            setLoading(false);
            alert('Branch updated successfully!');
        }, 1000);
    };

    // Handle delete branch
    const handleDeleteBranch = (branchId) => {
        setBranchData(prev => prev.filter(branch => branch.id !== branchId));
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
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Open add modal
    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    // Open edit modal
    const openEditModal = (branch) => {
        setSelectedBranch(branch);
        setFormData({
            name: branch.name,
            branch_id: branch.branch_id,
            mobile: branch.mobile,
            email: branch.email,
            address: branch.address,
            status: branch.status,
            is_head: branch.is_head,
            admin_login_id: branch.admin.login_id,
            admin_password: branch.admin.password
        });
        setShowEditModal(true);
    };

    // Toggle status
    const toggleStatus = () => {
        setFormData(prev => ({
            ...prev,
            status: prev.status === 1 ? 0 : 1
        }));
    };

    // Toggle branch type
    const toggleBranchType = () => {
        setFormData(prev => ({
            ...prev,
            is_head: prev.is_head === 1 ? 0 : 1
        }));
    };

    const getStatusBadge = (status, isHead) => {
        if (isHead) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border border-yellow-600">
                    <FiStar className="w-3 h-3 mr-1" />
                    Main Branch
                </span>
            );
        }
        return status === 1 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-600">
                <FiCheckCircle className="w-3 h-3 mr-1" />
                Active
            </span>
        ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-600">
                <FiXCircle className="w-3 h-3 mr-1" />
                Inactive
            </span>
        );
    };

    const getTypeBadge = (isHead) => {
        return isHead ? (
            <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded border border-yellow-200">
                Main Branch
            </span>
        ) : (
            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded border border-blue-200">
                Sub Branch
            </span>
        );
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
                <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
            </td>
            <td className="p-4">
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
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
                                            Branch Management
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            {filteredBranches.length} of {branchData.length} branches shown
                                        </p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                        {/* Search Input */}
                                        <div className="flex-1 relative min-w-[300px]">
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search by name, mobile, email, or branch ID..."
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

                                            {/* Type Filter */}
                                            <select
                                                value={selectedType}
                                                onChange={(e) => setSelectedType(e.target.value)}
                                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
                                            >
                                                <option value="">All Types</option>
                                                <option value="main">Main Branch</option>
                                                <option value="sub">Sub Branch</option>
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
                                                Add Branch
                                            </motion.button>

                                            <motion.button
                                                onClick={() => fetchBranchData()}
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
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Branch Details</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Contact Information</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                                            <th className="text-left p-4 font-semibold text-gray-700 text-sm">Admin Credentials</th>
                                            <th className="text-center p-4 font-semibold text-gray-700 text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            // Skeleton Loaders
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <SkeletonRow key={index} />
                                            ))
                                        ) : filteredBranches.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center">
                                                    <div className="flex flex-col items-center justify-center py-8">
                                                        <FiHome className="w-16 h-16 text-gray-300 mb-4" />
                                                        <p className="text-gray-500 text-lg font-medium mb-2">No branches found</p>
                                                        <p className="text-gray-400 text-sm mb-6">Try adjusting your search or add a new branch</p>
                                                        <motion.button
                                                            onClick={openAddModal}
                                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <FiPlus className="w-4 h-4 inline mr-2" />
                                                            Add New Branch
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredBranches.map((branch, index) => (
                                                <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBranches.has(branch.id)}
                                                            onChange={() => handleBranchSelect(branch.id)}
                                                            className="w-4 h-4 text-blue-600 rounded border-gray-400 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 font-medium">
                                                        {index + 1}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 bg-gradient-to-br ${branch.is_head ? 'from-yellow-500 to-yellow-600' : 'from-blue-500 to-blue-600'} rounded-lg flex items-center justify-center shadow-sm`}>
                                                                <FiHome className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-gray-800 text-sm">
                                                                    {branch.name}
                                                                </div>
                                                                <div className="text-xs text-red-500 font-medium mt-1">
                                                                    {branch.branch_id}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                                                    {branch.address}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                                <FiPhone className="w-3 h-3 text-gray-400" />
                                                                {branch.mobile}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                                <FiMail className="w-3 h-3 text-gray-400" />
                                                                {branch.email}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-2">
                                                            <div>
                                                                {getStatusBadge(branch.status, branch.is_head)}
                                                            </div>
                                                            <div className="mt-1">
                                                                {getTypeBadge(branch.is_head)}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-2">
                                                                Created: {formatDate(branch.created_date)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <FiUser className="w-3 h-3 text-gray-400" />
                                                                <span className="text-gray-600">Username:</span>
                                                                <code className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                                                    {branch.admin.login_id}
                                                                </code>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <FiSettings className="w-3 h-3 text-gray-400" />
                                                                <span className="text-gray-600">Password:</span>
                                                                <code className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                                                    {branch.admin.password}
                                                                </code>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <motion.button
                                                                onClick={() => openEditModal(branch)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Edit Branch"
                                                                disabled={branch.is_head === 1}
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                            >
                                                                <FiEdit className="w-4 h-4" />
                                                            </motion.button>
                                                            <motion.button
                                                                onClick={() => {
                                                                    setSelectedBranch(branch);
                                                                    setDeleteModal(true);
                                                                }}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Delete Branch"
                                                                disabled={branch.is_head === 1}
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
                                            Showing {filteredBranches.length} of {branchData.length} branches
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            <div className="text-sm text-gray-600 mr-4">
                                                {selectedBranches.size} branch(es) selected
                                            </div>
                                            <motion.button
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedBranches.size === 0}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiMailIcon className="w-4 h-4" />
                                                Send Message
                                            </motion.button>
                                            <motion.button
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedBranches.size === 0}
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

            {/* Add Branch Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Add New Branch</h2>
                                <p className="text-green-100 text-sm mt-1">Create a new branch with admin credentials</p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-white hover:text-green-200 transition-colors duration-200 p-1 rounded-lg hover:bg-green-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddBranch}>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiHome className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Branch Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            placeholder="Enter branch name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiGlobe className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Branch ID
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.branch_id}
                                            onChange={(e) => handleInputChange('branch_id', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            placeholder="Ex: BR001"
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
                                            placeholder="branch@company.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FiMapPin className="inline w-4 h-4 mr-2 text-gray-400" />
                                        Address
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                        placeholder="Enter complete address"
                                        rows="3"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-medium text-gray-700">
                                                Branch Type
                                            </label>
                                            <button
                                                type="button"
                                                onClick={toggleBranchType}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    formData.is_head === 1 
                                                        ? 'bg-yellow-500' 
                                                        : 'bg-blue-500'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        formData.is_head === 1 
                                                            ? 'translate-x-6' 
                                                            : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        <div className="text-center">
                                            <span className={`text-sm font-medium ${formData.is_head === 1 ? 'text-yellow-700' : 'text-blue-700'}`}>
                                                {formData.is_head === 1 ? 'Main Branch' : 'Sub Branch'}
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formData.is_head === 1 
                                                    ? 'Primary branch with full access'
                                                    : 'Secondary branch with limited access'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-medium text-gray-700">
                                                Status
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
                                                {formData.status === 1 ? 'Active' : 'Inactive'}
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formData.status === 1 
                                                    ? 'Branch is currently active'
                                                    : 'Branch is currently inactive'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 mb-6">
                                    <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                                        <FiKey className="w-4 h-4 text-blue-600" />
                                        Admin Credentials
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Admin Username
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.admin_login_id}
                                                onChange={(e) => handleInputChange('admin_login_id', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                                placeholder="admin_branch"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Admin Password
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.admin_password}
                                                onChange={(e) => handleInputChange('admin_password', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                                placeholder="password123"
                                                required
                                            />
                                        </div>
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
                                    {loading ? 'Adding...' : 'Add Branch'}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Edit Branch Modal */}
            {showEditModal && selectedBranch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Edit Branch</h2>
                                <p className="text-blue-100 text-sm mt-1">Update branch information and settings</p>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-white hover:text-blue-200 transition-colors duration-200 p-1 rounded-lg hover:bg-blue-500"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditBranch}>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                        <FiHome className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <div className="font-semibold text-gray-800">
                                                {selectedBranch?.name}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                Branch ID: {selectedBranch?.branch_id}
                                            </div>
                                        </div>
                                        <div className="ml-auto">
                                            {getStatusBadge(selectedBranch?.status, selectedBranch?.is_head)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiHome className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Branch Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            placeholder="Enter branch name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiGlobe className="inline w-4 h-4 mr-2 text-gray-400" />
                                            Branch ID
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.branch_id}
                                            onChange={(e) => handleInputChange('branch_id', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                            disabled
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
                                            placeholder="branch@company.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FiMapPin className="inline w-4 h-4 mr-2 text-gray-400" />
                                        Address
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                        placeholder="Enter complete address"
                                        rows="3"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-medium text-gray-700">
                                                Branch Type
                                            </label>
                                            <button
                                                type="button"
                                                onClick={toggleBranchType}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    formData.is_head === 1 
                                                        ? 'bg-yellow-500' 
                                                        : 'bg-blue-500'
                                                }`}
                                                disabled={selectedBranch?.is_head === 1}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        formData.is_head === 1 
                                                            ? 'translate-x-6' 
                                                            : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        <div className="text-center">
                                            <span className={`text-sm font-medium ${formData.is_head === 1 ? 'text-yellow-700' : 'text-blue-700'}`}>
                                                {formData.is_head === 1 ? 'Main Branch' : 'Sub Branch'}
                                            </span>
                                            {selectedBranch?.is_head === 1 && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    Cannot change type of main branch
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-medium text-gray-700">
                                                Status
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
                                                {formData.status === 1 ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                                        <FiKey className="w-4 h-4 text-blue-600" />
                                        Admin Credentials
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Admin Username
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.admin_login_id}
                                                onChange={(e) => handleInputChange('admin_login_id', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Admin Password
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.admin_password}
                                                onChange={(e) => handleInputChange('admin_password', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                                                required
                                            />
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
                                    className="px-6 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiEdit className="w-4 h-4" />
                                    {loading ? 'Updating...' : 'Update Branch'}
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

            {deleteModal && selectedBranch && (
                <DeleteConfirmationModal
                    title={`Delete ${selectedBranch.name}`}
                    message={`Are you sure you want to delete the "${selectedBranch.name}" branch? This action will remove all associated data and cannot be undone.`}
                    onConfirm={(res) => {
                        if (res.confirmed) {
                            handleDeleteBranch(selectedBranch.id);
                        }
                        setDeleteModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default ViewBranch;