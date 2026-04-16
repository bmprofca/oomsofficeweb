import React, { useState, useEffect, memo, useCallback } from 'react';
import {
    FiRefreshCw,
    FiUser,
    FiPhone,
    FiMail,
    FiAlertTriangle,
    FiClock,
    FiCalendar,
    FiCheckCircle,
    FiArchive,
    FiHelpCircle,
    FiSearch,
    FiFilter,
    FiX,
    FiEye,
    FiEdit,
    FiTrash2,
    FiTrendingUp,
    FiUsers,
    FiChevronRight,
    FiChevronDown,
    FiChevronUp,
    FiChevronLeft,
    FiChevronRight as FiChevronRightIcon
} from 'react-icons/fi';
import { IoTrash } from "react-icons/io5";
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';

// Memoized ModalWrapper component
const ModalWrapper = memo(({ isOpen, onClose, title, children, size = 'max-w-4xl' }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className={`relative w-full ${size} bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}
                >
                    <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                        <h2 className="text-xl font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-blue-200 hover:text-white p-1.5 rounded-lg transition-colors hover:bg-blue-800/50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {children}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

ModalWrapper.displayName = 'ModalWrapper';

const StaffReport = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [taskData, setTaskData] = useState([]);
    const [filteredTaskData, setFilteredTaskData] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [taskModal, setTaskModal] = useState({ open: false, type: '', staff: null, tasks: [] });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);

    // Mock services data
    const mockServices = [
        { service_id: '1', name: 'Income Tax Filing' },
        { service_id: '2', name: 'GST Registration' },
        { service_id: '3', name: 'Company Incorporation' },
        { service_id: '4', name: 'Audit Services' },
        { service_id: '5', name: 'Compliance Management' }
    ];

    // Mock task summary data
    const mockTaskData = [
        {
            username: 'staff001',
            name: 'John Doe',
            guardian_name: 'Robert Doe',
            mobile: '+91 9876543210',
            email: 'john.doe@company.com',
            OD: 5,
            DT: 3,
            D7: 8,
            FT: 12,
            WIP: 7,
            PFC: 2,
            PFD: 4
        },
        {
            username: 'staff002',
            name: 'Jane Smith',
            guardian_name: 'William Smith',
            mobile: '+91 9876543211',
            email: 'jane.smith@company.com',
            OD: 2,
            DT: 1,
            D7: 4,
            FT: 8,
            WIP: 3,
            PFC: 1,
            PFD: 2
        },
        {
            username: 'staff003',
            name: 'Mike Johnson',
            guardian_name: 'David Johnson',
            mobile: '+91 9876543212',
            email: 'mike.johnson@company.com',
            OD: 8,
            DT: 4,
            D7: 6,
            FT: 10,
            WIP: 5,
            PFC: 3,
            PFD: 6
        },
        {
            username: 'staff004',
            name: 'Sarah Wilson',
            guardian_name: 'James Wilson',
            mobile: '+91 9876543213',
            email: 'sarah.wilson@company.com',
            OD: 1,
            DT: 0,
            D7: 2,
            FT: 5,
            WIP: 2,
            PFC: 0,
            PFD: 1
        },
        {
            username: 'staff005',
            name: 'Robert Brown',
            guardian_name: 'Thomas Brown',
            mobile: '+91 9876543214',
            email: 'robert.brown@company.com',
            OD: 3,
            DT: 2,
            D7: 5,
            FT: 7,
            WIP: 4,
            PFC: 1,
            PFD: 3
        },
        {
            username: 'staff006',
            name: 'Emily Davis',
            guardian_name: 'Thomas Davis',
            mobile: '+91 9876543215',
            email: 'emily.d@company.com',
            OD: 6,
            DT: 3,
            D7: 9,
            FT: 15,
            WIP: 8,
            PFC: 2,
            PFD: 5
        },
        {
            username: 'staff007',
            name: 'David Wilson',
            guardian_name: 'Richard Wilson',
            mobile: '+91 9876543216',
            email: 'david.w@company.com',
            OD: 4,
            DT: 2,
            D7: 6,
            FT: 9,
            WIP: 5,
            PFC: 1,
            PFD: 4
        },
        {
            username: 'staff008',
            name: 'Lisa Anderson',
            guardian_name: 'Charles Anderson',
            mobile: '+91 9876543217',
            email: 'lisa.a@company.com',
            OD: 2,
            DT: 1,
            D7: 3,
            FT: 6,
            WIP: 3,
            PFC: 0,
            PFD: 2
        },
        {
            username: 'staff009',
            name: 'Kevin Martinez',
            guardian_name: 'Joseph Martinez',
            mobile: '+91 9876543218',
            email: 'kevin.m@company.com',
            OD: 7,
            DT: 3,
            D7: 8,
            FT: 13,
            WIP: 6,
            PFC: 2,
            PFD: 6
        },
        {
            username: 'staff010',
            name: 'Amanda Taylor',
            guardian_name: 'Christopher Taylor',
            mobile: '+91 9876543219',
            email: 'amanda.t@company.com',
            OD: 3,
            DT: 1,
            D7: 4,
            FT: 8,
            WIP: 4,
            PFC: 1,
            PFD: 3
        }
    ];

    // Mock task details data
    const mockTaskDetails = {
        'staff001': {
            'OD': [
                { id: 1, task_name: 'Tax Filing - ABC Corp', due_date: '2024-01-10', client: 'ABC Corporation', priority: 'High', status: 'Overdue' },
                { id: 2, task_name: 'GST Return - XYZ Ltd', due_date: '2024-01-12', client: 'XYZ Enterprises', priority: 'High', status: 'Overdue' },
                { id: 3, task_name: 'Audit Report - Global Inc', due_date: '2024-01-15', client: 'Global Solutions', priority: 'Medium', status: 'Overdue' }
            ],
            'DT': [
                { id: 4, task_name: 'Monthly Compliance', due_date: '2024-01-20', client: 'Tech Innovators', priority: 'High', status: 'Due Today' }
            ],
            'D7': [
                { id: 5, task_name: 'Quarterly Review', due_date: '2024-01-25', client: 'Manufacturing Corp', priority: 'Medium', status: 'Due in 7 Days' },
                { id: 6, task_name: 'Financial Statements', due_date: '2024-01-26', client: 'Service Providers', priority: 'High', status: 'Due in 7 Days' }
            ]
        },
        'staff002': {
            'DT': [
                { id: 7, task_name: 'Client Meeting Preparation', due_date: '2024-01-20', client: 'Retail Masters', priority: 'High', status: 'Due Today' }
            ],
            'D7': [
                { id: 8, task_name: 'Project Documentation', due_date: '2024-01-22', client: 'Digital Solutions', priority: 'Medium', status: 'Due in 7 Days' }
            ]
        }
    };

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

    // Initialize data - runs only once on mount
    useEffect(() => {
        fetchServices();
        fetchInitialTaskData();
    }, []);

    // Fetch services data - runs only once
    const fetchServices = async () => {
        setTimeout(() => {
            setServices(mockServices);
        }, 500);
    };

    // Fetch initial task data - runs only once
    const fetchInitialTaskData = async () => {
        setLoading(true);
        setTimeout(() => {
            setTaskData(mockTaskData);
            setFilteredTaskData(mockTaskData);
            setLoading(false);
        }, 1000);
    };

    // Handle service filter change - only updates state, doesn't trigger fetch
    const handleServiceChange = (e) => {
        setSelectedService(e.target.value);
        // Reset to page 1 when filter changes
        setCurrentPage(1);
        setShowAll(false);
    };

    // Apply filters without re-fetching data
    const applyFilters = useCallback(() => {
        setLoading(true);
        
        // Simulate API call delay
        setTimeout(() => {
            let filteredData = mockTaskData;
            
            // Apply service filter
            if (selectedService) {
                filteredData = mockTaskData.filter(item => 
                    item.username.includes(selectedService)
                );
            }

            // Apply search filter
            if (searchQuery.trim()) {
                filteredData = filteredData.filter(item =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.mobile.includes(searchQuery)
                );
            }
            
            setFilteredTaskData(filteredData);
            setLoading(false);
        }, 300);
    }, [selectedService, searchQuery]);

    // Handle search - applies filters
    const handleSearch = () => {
        applyFilters();
    };

    // Handle key press in search input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Reload only table data without refreshing the whole page
    const handleReload = () => {
        setLoading(true);
        // Reset pagination
        setCurrentPage(1);
        setShowAll(false);
        
        // Simulate API refresh
        setTimeout(() => {
            applyFilters();
        }, 500);
    };

    // Open task modal
    const openTaskModal = (type, staff) => {
        const tasks = mockTaskDetails[staff.username]?.[type] || [];
        setTaskModal({
            open: true,
            type: type,
            staff: staff,
            tasks: tasks
        });
    };

    // Close task modal
    const closeTaskModal = () => {
        setTaskModal({ open: false, type: '', staff: null, tasks: [] });
    };

    // Apply filters when selectedService or searchQuery changes
    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    // Clear all filters
    const handleClearFilters = () => {
        setSelectedService('');
        setSearchQuery('');
        setCurrentPage(1);
        setShowAll(false);
    };

    // Get badge color based on task type and count
    const getBadgeClass = (count, type) => {
        if (count === 0) return 'text-slate-400 cursor-default';
        
        const baseClasses = 'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold cursor-pointer transition-all hover:scale-110 shadow-sm';
        
        switch (type) {
            case 'OD': // Overdue
                return `${baseClasses} bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200 hover:from-red-200 hover:to-red-100`;
            case 'DT': // Due Today
                return `${baseClasses} bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200 hover:from-orange-200 hover:to-orange-100`;
            case 'D7': // Due in 7 days
                return `${baseClasses} bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200 hover:from-blue-200 hover:to-blue-100`;
            case 'FT': // Future Tasks
                return `${baseClasses} bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200 hover:from-green-200 hover:to-green-100`;
            case 'WIP': // Work in Progress
                return `${baseClasses} bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200 hover:from-purple-200 hover:to-purple-100`;
            case 'PFC': // Pending from Client
            case 'PFD': // Pending from Department
                return `${baseClasses} bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200 hover:from-yellow-200 hover:to-yellow-100`;
            default:
                return `${baseClasses} bg-gradient-to-r from-slate-100 to-slate-50 text-slate-800 border border-slate-200 hover:from-slate-200 hover:to-slate-100`;
        }
    };

    // Get icon for task type
    const getTaskIcon = (type) => {
        switch (type) {
            case 'OD': return <FiAlertTriangle className="w-3 h-3" />;
            case 'DT': return <FiClock className="w-3 h-3" />;
            case 'D7': return <FiCalendar className="w-3 h-3" />;
            case 'FT': return <FiCheckCircle className="w-3 h-3" />;
            case 'WIP': return <FiArchive className="w-3 h-3" />;
            case 'PFC':
            case 'PFD': return <FiHelpCircle className="w-3 h-3" />;
            default: return <FiHelpCircle className="w-3 h-3" />;
        }
    };

    // Get task type full name
    const getTaskTypeName = (type) => {
        switch (type) {
            case 'OD': return 'Overdue Tasks';
            case 'DT': return 'Due Today Tasks';
            case 'D7': return 'Due in 7 Days Tasks';
            case 'FT': return 'Future Tasks';
            case 'WIP': return 'Work in Progress Tasks';
            case 'PFC': return 'Pending from Client Tasks';
            case 'PFD': return 'Pending from Department Tasks';
            default: return 'Tasks';
        }
    };

    // Calculate totals from filtered data
    const calculateTotals = () => {
        return filteredTaskData.reduce((acc, staff) => ({
            OD: acc.OD + staff.OD,
            DT: acc.DT + staff.DT,
            D7: acc.D7 + staff.D7,
            FT: acc.FT + staff.FT,
            WIP: acc.WIP + staff.WIP,
            PFC: acc.PFC + staff.PFC,
            PFD: acc.PFD + staff.PFD,
            total: acc.total + staff.OD + staff.DT + staff.D7 + staff.FT + staff.WIP + staff.PFC + staff.PFD
        }), { OD: 0, DT: 0, D7: 0, FT: 0, WIP: 0, PFC: 0, PFD: 0, total: 0 });
    };

    const totals = calculateTotals();

    // Get current items based on pagination
    const indexOfLastItem = showAll ? filteredTaskData.length : currentPage * itemsPerPage;
    const indexOfFirstItem = showAll ? 0 : (currentPage - 1) * itemsPerPage;
    const currentItems = filteredTaskData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTaskData.length / itemsPerPage);

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                        <div className="h-3 bg-slate-200 rounded w-24"></div>
                    </div>
                </div>
            </td>
            <td className="p-4">
                <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-28"></div>
                    <div className="h-3 bg-slate-200 rounded w-32"></div>
                </div>
            </td>
            {Array.from({ length: 7 }).map((_, index) => (
                <td key={index} className="p-4">
                    <div className="h-8 bg-slate-200 rounded w-8 mx-auto"></div>
                </td>
            ))}
        </tr>
    );

    // Skeleton Loading Component for full page
    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="border-b border-slate-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="h-10 bg-gray-200 rounded w-40"></div>
                                    <div className="h-10 bg-gray-200 rounded w-40"></div>
                                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden">
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            {[...Array(9)].map((_, i) => (
                                                <th key={i} className="p-4">
                                                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                </table>
                            </div>

                            <div className="p-4">
                                {[...Array(6)].map((_, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="h-12 bg-gray-100 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Show skeleton while loading
    if (loading && currentItems.length === 0) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-xs font-medium">Total Staff</p>
                                    <h3 className="text-lg font-bold mt-1">{filteredTaskData.length} Members</h3>
                                </div>
                                <FiUsers className="w-5 h-5 opacity-80" />
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-4 text-white shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-100 text-xs font-medium">Total Tasks</p>
                                    <h3 className="text-lg font-bold mt-1">{totals.total} Tasks</h3>
                                </div>
                                <FiTrendingUp className="w-5 h-5 opacity-80" />
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.2 }}
                            className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-red-100 text-xs font-medium">Overdue Tasks</p>
                                    <h3 className="text-lg font-bold mt-1">{totals.OD} Tasks</h3>
                                </div>
                                <FiAlertTriangle className="w-5 h-5 opacity-80" />
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.3 }}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-xs font-medium">In Progress</p>
                                    <h3 className="text-lg font-bold mt-1">{totals.WIP} Tasks</h3>
                                </div>
                                <FiArchive className="w-5 h-5 opacity-80" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Main Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl shadow-lg border border-slate-200"
                    >
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                            <FiTrendingUp className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h5 className="text-lg font-bold text-slate-800">
                                            Pending Task Summary
                                        </h5>
                                    </div>
                                    <p className="text-slate-500 text-xs font-medium">
                                        Staff-wise task tracking and management
                                    </p>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                    <div className="flex gap-2">
                                        {/* Search Input */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Search staff..."
                                                className="pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-colors w-full lg:w-64 shadow-sm"
                                            />
                                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        </div>

                                        {/* Service Filter */}
                                        <div className="relative">
                                            <select
                                                value={selectedService}
                                                onChange={handleServiceChange}
                                                className="pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-colors appearance-none w-full lg:w-48 shadow-sm"
                                            >
                                                <option value="">All Services</option>
                                                {services.map(service => (
                                                    <option key={service.service_id} value={service.service_id}>
                                                        {service.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        </div>

                                        {/* Clear Filters Button */}
                                        {(selectedService || searchQuery) && (
                                            <motion.button
                                                onClick={handleClearFilters}
                                                className="px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FiX className="w-4 h-4" />
                                                Clear
                                            </motion.button>
                                        )}

                                        {/* Action Buttons */}
                                        <motion.button
                                            onClick={handleReload}
                                            disabled={loading}
                                            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow disabled:opacity-50"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[200px]">
                                            STAFF DETAILS
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[150px]">
                                            CONTACT INFO
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]" title="Overdue Tasks">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-xs">OD</span>
                                                <span className="text-[10px] font-normal text-slate-500 mt-0.5">Overdue</span>
                                            </div>
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]" title="Due Today">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-xs">DT</span>
                                                <span className="text-[10px] font-normal text-slate-500 mt-0.5">Due Today</span>
                                            </div>
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]" title="Due in 7 Days">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-xs">D7</span>
                                                <span className="text-[10px] font-normal text-slate-500 mt-0.5">7 Days</span>
                                            </div>
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]" title="Future Tasks">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-xs">FT</span>
                                                <span className="text-[10px] font-normal text-slate-500 mt-0.5">Future</span>
                                            </div>
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]" title="Work in Progress">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-xs">WIP</span>
                                                <span className="text-[10px] font-normal text-slate-500 mt-0.5">In Progress</span>
                                            </div>
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]" title="Pending from Client">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-xs">PFC</span>
                                                <span className="text-[10px] font-normal text-slate-500 mt-0.5">From Client</span>
                                            </div>
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]" title="Pending from Department">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-xs">PFD</span>
                                                <span className="text-[10px] font-normal text-slate-500 mt-0.5">From Dept</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {filteredTaskData.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiUser className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No task records found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Try adjusting your search or filters</p>
                                                    <button
                                                        onClick={handleClearFilters}
                                                        className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors"
                                                    >
                                                        Clear Filters
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {/* Show skeleton rows when loading with existing data */}
                                            {loading && [...Array(3)].map((_, index) => (
                                                <SkeletonRow key={`skeleton-${index}`} />
                                            ))}
                                            
                                            {/* Show actual data when not loading */}
                                            {!loading && currentItems.map((staff, index) => {
                                                const actualIndex = showAll ? index : (currentPage - 1) * itemsPerPage + index;

                                                return (
                                                    <motion.tr
                                                        key={staff.username}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="hover:bg-blue-50/20 transition-colors duration-150"
                                                    >
                                                        <td className="text-center p-3 align-middle">
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full flex items-center justify-center mb-2">
                                                                    <FiUser className="w-5 h-5 text-blue-600" />
                                                                </div>
                                                                <div className="font-semibold text-slate-800 text-sm">{staff.name}</div>
                                                                <div className="text-slate-500 text-xs mt-0.5">
                                                                    C/O: {staff.guardian_name}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center p-3 align-middle">
                                                            <div className="flex flex-col items-center">
                                                                <div className="flex items-center gap-2 text-slate-800 font-medium text-xs">
                                                                    <FiPhone className="w-3 h-3 text-blue-500" />
                                                                    {staff.mobile}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                                                                    <FiMail className="w-3 h-3 text-blue-400" />
                                                                    {staff.email}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {/* Task Count Cells - All aligned center */}
                                                        {['OD', 'DT', 'D7', 'FT', 'WIP', 'PFC', 'PFD'].map((type) => (
                                                            <td key={type} className="text-center p-3 align-middle">
                                                                {staff[type] > 0 ? (
                                                                    <button
                                                                        onClick={() => openTaskModal(type, staff)}
                                                                        className={getBadgeClass(staff[type], type)}
                                                                        title={`${staff[type]} ${getTaskTypeName(type)} - Click to view details`}
                                                                    >
                                                                        {getTaskIcon(type)}
                                                                        {staff[type]}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-slate-400 text-xs">-</span>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </motion.tr>
                                                );
                                            })}
                                        </>
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {filteredTaskData.length > itemsPerPage && !showAll && !loading && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-3">
                                        <div className="text-xs text-slate-600">
                                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTaskData.length)} of {filteredTaskData.length} staff members
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                            >
                                                <FiChevronLeft className="w-3 h-3" />
                                                Previous
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNumber;
                                                    if (totalPages <= 5) {
                                                        pageNumber = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNumber = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNumber = totalPages - 4 + i;
                                                    } else {
                                                        pageNumber = currentPage - 2 + i;
                                                    }
                                                    
                                                    return (
                                                        <button
                                                            key={pageNumber}
                                                            onClick={() => setCurrentPage(pageNumber)}
                                                            className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                                                                currentPage === pageNumber
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                                                            }`}
                                                        >
                                                            {pageNumber}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                            >
                                                Next
                                                <FiChevronRightIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setShowAll(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                                        >
                                            Show All
                                            <FiChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Show Less Button when showing all */}
                            {showAll && filteredTaskData.length > itemsPerPage && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex justify-center px-4 py-3">
                                        <button
                                            onClick={() => {
                                                setShowAll(false);
                                                setCurrentPage(1);
                                            }}
                                            className="flex items-center gap-1 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                                        >
                                            Show Less
                                            <FiChevronUp className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Task Details Modal */}
            <ModalWrapper
                isOpen={taskModal.open}
                onClose={closeTaskModal}
                title={`${getTaskTypeName(taskModal.type)} - ${taskModal.staff?.name || ''}`}
                size="max-w-6xl"
            >
                <div className="flex-1 flex flex-col p-6">
                    {/* Staff Info Header */}
                    {taskModal.staff && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                                        <FiUser className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 text-sm">{taskModal.staff.name}</h3>
                                        <p className="text-slate-600 text-xs">
                                            {taskModal.staff.mobile} • {taskModal.staff.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-600">{taskModal.tasks.length}</div>
                                    <div className="text-slate-600 text-xs">{getTaskTypeName(taskModal.type)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tasks Card with Scrollable Table */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col flex-1">
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-lg">
                            <h4 className="text-lg font-semibold text-slate-800">Task Details</h4>
                        </div>

                        {/* Scrollable Table Container */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* Table Header - Fixed */}
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            <th className="text-left p-4 font-semibold text-slate-700 text-xs align-middle">TASK NAME</th>
                                            <th className="text-left p-4 font-semibold text-slate-700 text-xs align-middle">CLIENT</th>
                                            <th className="text-left p-4 font-semibold text-slate-700 text-xs align-middle">DUE DATE</th>
                                            <th className="text-center p-4 font-semibold text-slate-700 text-xs align-middle">PRIORITY</th>
                                            <th className="text-center p-4 font-semibold text-slate-700 text-xs align-middle">STATUS</th>
                                            <th className="text-center p-4 font-semibold text-slate-700 text-xs align-middle">ACTIONS</th>
                                        </tr>
                                    </thead>
                                </table>
                            </div>

                            {/* Scrollable Table Body */}
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <tbody className="bg-white">
                                        {taskModal.tasks.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-8 text-slate-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                            <FiHelpCircle className="w-8 h-8 text-slate-400" />
                                                        </div>
                                                        <p className="text-slate-600 text-sm font-medium mb-1">No tasks found</p>
                                                        <p className="text-slate-500 text-xs">
                                                            No {getTaskTypeName(taskModal.type).toLowerCase()} for this staff member
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            taskModal.tasks.map((task) => (
                                                <tr key={task.id} className="border-b border-slate-100 hover:bg-blue-50/20 transition-colors">
                                                    <td className="p-4 align-middle">
                                                        <div className="font-medium text-slate-800 text-xs">{task.task_name}</div>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <div className="text-slate-600 text-xs">{task.client}</div>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <div className="text-slate-600 text-xs">{task.due_date}</div>
                                                    </td>
                                                    <td className="p-4 align-middle text-center">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium ${
                                                            task.priority === 'High' ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200' :
                                                            task.priority === 'Medium' ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200' :
                                                            'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200'
                                                        }`}>
                                                            {task.priority}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle text-center">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium ${
                                                            task.status === 'Overdue' ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200' :
                                                            task.status === 'Due Today' ? 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200' :
                                                            'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200'
                                                        }`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors hover:scale-110" title="View Details">
                                                                <FiEye className="w-4 h-4" />
                                                            </button>
                                                            <button className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors hover:scale-110" title="Edit Task">
                                                                <FiEdit className="w-4 h-4" />
                                                            </button>
                                                            <button className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors hover:scale-110" title="Delete Task">
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
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-b-xl">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={closeTaskModal}
                            className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors shadow-sm"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {/* Handle bulk action */}}
                            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
                        >
                            Export Tasks
                        </button>
                    </div>
                </div>
            </ModalWrapper>
        </div>
    );
};

export default StaffReport;