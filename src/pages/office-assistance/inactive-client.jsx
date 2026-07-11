import React, { useState, useEffect } from 'react';
import {
    FiSearch,
    FiSettings,
    FiMoreVertical,
    FiEye,
    FiEdit,
    FiUser,
    FiBriefcase,
    FiKey,
    FiCheckSquare,
    FiFileText,
    FiFile,
    FiCheck,
    FiX,
    FiSend,
    FiCalendar,
    FiUsers,
    FiDollarSign,
    FiAlertCircle,
    FiMail,
    FiPhone,
    FiCreditCard
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import DateFilter from '../../components/DateFilter';

const ViewInactiveClients = () => {
    // Header/Sidebar states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    // Main states
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [showFirmModal, setShowFirmModal] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [selectedClients, setSelectedClients] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [showActionDiv, setShowActionDiv] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Mock Inactive Clients data with dates
    const mockClientsData = [
        {
            username: 'client001',
            name: 'Rajesh Kumar',
            guardian_name: 'Suresh Kumar',
            mobile: '+91 9876543210',
            balance: -2500.50,
            status: 'inactive',
            created_date: '2024-01-15',
            last_active: '2024-01-20',
            firm_list: [
                {
                    firm_id: 'firm001',
                    firm_name: 'RK Enterprises',
                    pan: 'ABCDE1234F',
                    file_no: 'F001'
                },
                {
                    firm_id: 'firm002',
                    firm_name: 'RK Trading Co.',
                    pan: 'FGHIJ5678K',
                    file_no: 'F002'
                }
            ]
        },
        {
            username: 'client002',
            name: 'Priya Sharma',
            guardian_name: 'Ramesh Sharma',
            mobile: '+91 9876543211',
            balance: 1500.00,
            status: 'inactive',
            created_date: '2024-01-10',
            last_active: '2024-01-18',
            firm_list: [
                {
                    firm_id: 'firm003',
                    firm_name: 'PS Fashion House',
                    pan: 'KLMNO9012P',
                    file_no: 'F003'
                }
            ]
        },
        {
            username: 'client003',
            name: 'Amit Patel',
            guardian_name: 'Dinesh Patel',
            mobile: '+91 9876543212',
            balance: -5000.75,
            status: 'inactive',
            created_date: '2024-01-05',
            last_active: '2024-01-12',
            firm_list: [
                {
                    firm_id: 'firm004',
                    firm_name: 'AP Manufacturing',
                    pan: 'QRSTU3456V',
                    file_no: 'F004'
                },
                {
                    firm_id: 'firm005',
                    firm_name: 'AP Exports',
                    pan: 'WXYZA7890B',
                    file_no: 'F005'
                }
            ]
        },
        {
            username: 'client004',
            name: 'Sneha Gupta',
            guardian_name: 'Anil Gupta',
            mobile: '+91 9876543213',
            balance: 0.00,
            status: 'inactive',
            created_date: '2024-01-20',
            last_active: '2024-01-25',
            firm_list: [
                {
                    firm_id: 'firm006',
                    firm_name: 'SG Consultancy',
                    pan: 'CDEFG1234H',
                    file_no: 'F006'
                }
            ]
        },
        {
            username: 'client005',
            name: 'Vikram Singh',
            guardian_name: 'Rajendra Singh',
            mobile: '+91 9876543214',
            balance: -12000.25,
            status: 'inactive',
            created_date: '2024-01-18',
            last_active: '2024-01-22',
            firm_list: [
                {
                    firm_id: 'firm007',
                    firm_name: 'VS Constructions',
                    pan: 'HIJKL5678M',
                    file_no: 'F007'
                },
                {
                    firm_id: 'firm008',
                    firm_name: 'VS Real Estate',
                    pan: 'NOPQR9012S',
                    file_no: 'F008'
                }
            ]
        },
        {
            username: 'client006',
            name: 'Anjali Mehta',
            guardian_name: 'Sanjay Mehta',
            mobile: '+91 9876543215',
            balance: -3500.00,
            status: 'inactive',
            created_date: '2024-01-12',
            last_active: '2024-01-19',
            firm_list: [
                {
                    firm_id: 'firm009',
                    firm_name: 'AM Textiles',
                    pan: 'STUVW1234X',
                    file_no: 'F009'
                }
            ]
        },
        {
            username: 'client007',
            name: 'Rahul Verma',
            guardian_name: 'Amit Verma',
            mobile: '+91 9876543216',
            balance: 800.00,
            status: 'inactive',
            created_date: '2024-01-08',
            last_active: '2024-01-15',
            firm_list: [
                {
                    firm_id: 'firm010',
                    firm_name: 'RV Electronics',
                    pan: 'YZABC5678D',
                    file_no: 'F010'
                }
            ]
        },
        {
            username: 'client008',
            name: 'Neha Reddy',
            guardian_name: 'Kumar Reddy',
            mobile: '+91 9876543217',
            balance: -7500.50,
            status: 'inactive',
            created_date: '2024-01-25',
            last_active: '2024-01-30',
            firm_list: [
                {
                    firm_id: 'firm011',
                    firm_name: 'NR Foods',
                    pan: 'EFGHI9012J',
                    file_no: 'F011'
                }
            ]
        }
    ];

    // Mock Firm Data
    const mockFirmData = {
        firm001: {
            firm_id: 'firm001',
            firm_name: 'RK Enterprises',
            pan: 'ABCDE1234F',
            gst: '07ABCDE1234F1Z5',
            vat: 'VAT001234',
            cin: 'U74999DL2019PTC123456',
            tin: 'TIN001234',
            file_no: 'F001',
            tan: 'BLRE12345F',
            firm_type: 'proprietorship',
            username: 'client001'
        },
        firm002: {
            firm_id: 'firm002',
            firm_name: 'RK Trading Co.',
            pan: 'FGHIJ5678K',
            gst: '07FGHIJ5678K1Z5',
            vat: 'VAT005678',
            cin: 'U74999DL2020PTC234567',
            tin: 'TIN005678',
            file_no: 'F002',
            tan: 'BLRE23456G',
            firm_type: 'partnership',
            username: 'client001'
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

    // Initial data load
    useEffect(() => {
        fetchClientsData();
    }, []);

    // Filter clients when search term or date range changes
    useEffect(() => {
        filterClients();
    }, [searchTerm, dateRange, clients]);

    // Update action div visibility
    useEffect(() => {
        setShowActionDiv(selectedClients.length > 0);
    }, [selectedClients]);

    // Update select all state
    useEffect(() => {
        if (filteredClients.length > 0) {
            setSelectAll(selectedClients.length === filteredClients.length);
        }
    }, [selectedClients, filteredClients]);

    // Simulate API call to fetch clients data
    const fetchClientsData = async () => {
        setLoading(true);

        // Simulate API delay
        setTimeout(() => {
            setClients(mockClientsData);
            setFilteredClients(mockClientsData);
            setLoading(false);
        }, 1000);
    };

    // Filter clients based on search term and date range
    const filterClients = () => {
        let filtered = clients;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(client =>
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.mobile.includes(searchTerm) ||
                client.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.firm_list.some(firm =>
                    firm.firm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    firm.pan.includes(searchTerm) ||
                    firm.file_no.includes(searchTerm)
                )
            );
        }

        // Filter by date range
        if (dateRange) {
            const [from, to] = dateRange.split(' - ');
            const fromDate = new Date(from.split('/').reverse().join('-'));
            const toDate = new Date(to.split('/').reverse().join('-'));
            
            filtered = filtered.filter(client => {
                const clientDate = new Date(client.created_date);
                return clientDate >= fromDate && clientDate <= toDate;
            });
        }

        setFilteredClients(filtered);
    };

    // Handle search
    const handleSearch = () => {
        filterClients();
    };

    // Handle firm click
    const handleFirmClick = (firmId) => {
        // Simulate API call to fetch firm data
        const firmData = mockFirmData[firmId];
        if (firmData) {
            setSelectedFirm(firmData);
            setShowFirmModal(true);
        }
    };

    // Handle client selection with toggle
    const handleClientSelect = (username) => {
        setSelectedClients(prev => {
            if (prev.includes(username)) {
                return prev.filter(client => client !== username);
            } else {
                return [...prev, username];
            }
        });
    };

    // Handle select all toggle
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedClients([]);
        } else {
            setSelectedClients(filteredClients.map(client => client.username));
        }
        setSelectAll(!selectAll);
    };

    // Handle payment reminder
    const handlePaymentReminder = () => {
        if (selectedClients.length === 0) return;

        if (window.confirm('Are you sure? This will send payment reminder message to selected clients')) {
            // Simulate API call
            console.log('Sending payment reminder to:', selectedClients);
            // In a real app, you would make an API call here

            // Clear selection after sending
            setSelectedClients([]);
            setSelectAll(false);
            alert('Payment reminders sent successfully!');
        }
    };

    // Toggle dropdown
    const toggleDropdown = (username) => {
        setActiveDropdown(activeDropdown === username ? null : username);
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

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        console.log('Selected filter:', filter);
        if (filter.range) {
            setDateRange(filter.range);
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    // Format firm type
    const formatFirmType = (type) => {
        return type ? type.toUpperCase() : '---';
    };

    // Calculate summary
    const summary = {
        totalClients: filteredClients.length,
        clientsWithBalance: filteredClients.filter(client => client.balance < 0).length,
        totalBalance: filteredClients.reduce((sum, client) => sum + client.balance, 0),
        totalFirms: filteredClients.reduce((sum, client) => sum + client.firm_list.length, 0)
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
            <td className="p-3 text-center">
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3">
                <div className="space-y-1.5">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                </div>
            </td>
            <td className="p-3">
                <div className="space-y-1">
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                </div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-8 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-5 mx-auto"></div>
            </td>
        </tr>
    );

    // Toggle Switch Component
    const ToggleSwitch = ({ isChecked, onChange, size = "md" }) => {
        const sizeClasses = {
            sm: "w-10 h-5",
            md: "w-12 h-6",
            lg: "w-14 h-7"
        };

        const dotSizeClasses = {
            sm: "w-4 h-4",
            md: "w-5 h-5",
            lg: "w-6 h-6"
        };

        return (
            <button
                type="button"
                className={`${sizeClasses[size]} flex items-center rounded-full p-1 cursor-pointer transition-all duration-200 ${
                    isChecked 
                        ? 'bg-indigo-600' 
                        : 'bg-gray-300'
                }`}
                onClick={onChange}
            >
                <div
                    className={`${dotSizeClasses[size]} bg-white rounded-full shadow transform transition-transform duration-200 ${
                        isChecked ? 'translate-x-6' : 'translate-x-0'
                    }`}
                />
            </button>
        );
    };

    // Show skeleton while loading
    if (loading && clients.length === 0) {
        return <SkeletonLoader />;
    }

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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Header with Stats */}
                        <div className="mb-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                                <div>
                                    <h5 className="text-2xl font-bold text-gray-800 mb-2">
                                        Inactive Clients
                                    </h5>
                                    <p className="text-gray-600 text-sm">
                                        View and manage inactive client accounts, send payment reminders
                                    </p>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Total Inactive Clients</p>
                                            <h3 className="text-2xl font-bold text-gray-800">{summary.totalClients}</h3>
                                        </div>
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <FiUser className="w-5 h-5 text-indigo-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Clients with Dues</p>
                                            <h3 className="text-2xl font-bold text-red-600">{summary.clientsWithBalance}</h3>
                                        </div>
                                        <div className="p-2 bg-red-50 rounded-lg">
                                            <FiAlertCircle className="w-5 h-5 text-red-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Total Dues Amount</p>
                                            <h3 className="text-2xl font-bold text-orange-600">₹{formatCurrency(Math.abs(summary.totalBalance))}</h3>
                                        </div>
                                        <div className="p-2 bg-orange-50 rounded-lg">
                                            <FiDollarSign className="w-5 h-5 text-orange-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Total Firms</p>
                                            <h3 className="text-2xl font-bold text-blue-600">{summary.totalFirms}</h3>
                                        </div>
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <FiBriefcase className="w-5 h-5 text-blue-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Card */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                            {/* Filters Bar */}
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                                    {/* Search Input */}
                                    <div className="relative flex-1 min-w-0">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search clients by name, mobile, PAN, or file number"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all text-sm"
                                        />
                                    </div>
                                    
                                    {/* Date Filter */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg bg-white min-w-[140px]">
                                            <FiCalendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                            <DateFilter 
                                                onChange={handleDateFilterChange}
                                                className="text-sm w-full bg-transparent border-none outline-none"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Results Count */}
                                    <div className="text-sm text-gray-600 whitespace-nowrap sm:ml-auto">
                                        <span className="font-semibold">{filteredClients.length}</span> of <span className="font-semibold">{clients.length}</span> clients
                                    </div>
                                </div>
                            </div>

                            {/* Table Container */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Table Header */}
                                <div className="bg-gray-50">
                                    <div className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-gray-200">
                                        <div className="col-span-1">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                #
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Client Details
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Firms
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Mobile
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Balance
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                Actions
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                             <div className="col-span-1">
            <div className="flex items-center justify-center">
                <ToggleSwitch 
                    isChecked={selectAll}
                    onChange={handleSelectAll}
                    size="sm"
                />
            </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Table Body */}
                                <div className="flex-1 overflow-y-auto">
                                    {loading ? (
                                        <div className="p-6">
                                            {Array.from({ length: 8 }).map((_, index) => (
                                                <SkeletonRow key={index} />
                                            ))}
                                        </div>
                                    ) : filteredClients.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="p-4 bg-gray-100 rounded-full mb-4">
                                                    <FiUser className="w-12 h-12 text-gray-400" />
                                                </div>
                                                <p className="text-gray-500 text-lg font-medium mb-2">
                                                    {clients.length === 0 ? 'No inactive clients available' : 'No matching clients found'}
                                                </p>
                                                <p className="text-gray-400 text-sm mb-4">
                                                    {clients.length === 0 
                                                        ? 'All clients are currently active' 
                                                        : 'Try adjusting your search or filter criteria'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6">
                                            {filteredClients.map((client, index) => {
                                                const isSelected = selectedClients.includes(client.username);
                                                const isDropdownOpen = activeDropdown === client.username;

                                                return (
                                                    <motion.div
                                                        key={client.username}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="grid grid-cols-12 gap-2 py-4 border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 group"
                                                    >
                                                        {/* # Column */}
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 font-semibold rounded-lg">
                                                                {index + 1}
                                                            </span>
                                                        </div>

                                                        {/* Client Details Column */}
                                                        <div className="col-span-3 flex flex-col items-center justify-center text-center">
                                                            <div className="mb-2">
                                                                <a
                                                                    href={`/view-client-profile?username=${client.username}`}
                                                                    className="text-gray-800 font-semibold text-sm mb-1 hover:text-indigo-600 transition-colors"
                                                                >
                                                                    {client.name}
                                                                </a>
                                                                <div className="text-gray-500 text-xs mt-1">
                                                                    Guardian: {client.guardian_name}
                                                                </div>
                                                            </div>
                                                            <div className="text-gray-500 text-xs">
                                                                Created: {formatDate(client.created_date)}
                                                            </div>
                                                        </div>

                                                        {/* Firms Column */}
                                                        <div className="col-span-2">
                                                            <div className="space-y-2">
                                                                {client.firm_list.map((firm, firmIndex) => (
                                                                    <div key={firm.firm_id} className="flex flex-col items-start justify-between text-xs p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                                        <button
                                                                            onClick={() => handleFirmClick(firm.firm_id)}
                                                                            className="text-green-600 hover:text-green-800 font-medium transition-colors text-left flex items-center gap-1"
                                                                        >
                                                                            <FiBriefcase className="w-3 h-3" />
                                                                            {firm.firm_name}
                                                                        </button>
                                                                        <div className="flex gap-1 mt-1 text-gray-500">
                                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{firm.pan}</span>
                                                                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">{firm.file_no}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Mobile Column */}
                                                        <div className="col-span-2 flex items-center justify-center">
                                                            <div className="inline-flex items-center gap-1 text-gray-600">
                                                                <FiPhone className="w-3 h-3" />
                                                                <span className="text-sm">{client.mobile}</span>
                                                            </div>
                                                        </div>

                                                        {/* Balance Column */}
                                                        <div className="col-span-2 flex items-center justify-center">
                                                            <a
                                                                href={`/view-client-profile-ledger?username=${client.username}`}
                                                                className={`inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold rounded-lg min-w-[80px] ${
                                                                    client.balance < 0
                                                                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                                } transition-colors`}
                                                            >
                                                                ₹{formatCurrency(Math.abs(client.balance))}
                                                            </a>
                                                        </div>

                                                        {/* Actions Column */}
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <div className="dropdown-container relative">
                                                                <motion.button
                                                                    className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group-hover:bg-gray-200"
                                                                    onClick={() => toggleDropdown(client.username)}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                >
                                                                    <FiMoreVertical className="w-4 h-4" />
                                                                </motion.button>
                                                                <AnimatePresence>
                                                                    {isDropdownOpen && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                                                                        >
                                                                            <div className="py-1">
                                                                                <a
                                                                                    href={`/view-client-profile?username=${client.username}`}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                                                    onClick={() => setActiveDropdown(null)}
                                                                                >
                                                                                    <FiUser className="w-4 h-4 mr-3" />
                                                                                    Profile
                                                                                </a>
                                                                                <a
                                                                                    href={`/view-client-profile-firms?username=${client.username}`}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                                                    onClick={() => setActiveDropdown(null)}
                                                                                >
                                                                                    <FiBriefcase className="w-4 h-4 mr-3" />
                                                                                    Firms
                                                                                </a>
                                                                                <a
                                                                                    href={`/view-client-profile-ledger?username=${client.username}`}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                                                    onClick={() => setActiveDropdown(null)}
                                                                                >
                                                                                    <FiFileText className="w-4 h-4 mr-3" />
                                                                                    Ledger
                                                                                </a>
                                                                                <a
                                                                                    href={`/view-client-profile-task?username=${client.username}`}
                                                                                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
                                                                                    onClick={() => setActiveDropdown(null)}
                                                                                >
                                                                                    <FiCheckSquare className="w-4 h-4 mr-3" />
                                                                                    Tasks
                                                                                </a>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>

                                                        {/* Selection Toggle Column */}
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <ToggleSwitch 
                                                                isChecked={isSelected}
                                                                onChange={() => handleClientSelect(client.username)}
                                                                size="sm"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Table Footer */}
                                <div className="border-t border-gray-200 bg-gray-50">
                                    <div className="px-6 py-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                            <div className="text-sm text-gray-600">
                                                Showing <span className="font-semibold">{filteredClients.length}</span> of{" "}
                                                <span className="font-semibold">{clients.length}</span> inactive clients
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-sm">
                                                    <span className="text-gray-600">Firms: </span>
                                                    <span className="font-semibold text-blue-600">{summary.totalFirms}</span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-gray-600">With Dues: </span>
                                                    <span className="font-semibold text-red-600">{summary.clientsWithBalance}</span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-gray-600">Total Dues: </span>
                                                    <span className="font-semibold text-orange-600">₹{formatCurrency(Math.abs(summary.totalBalance))}</span>
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

            {/* Action Div - Fixed with sidebar responsiveness */}
            <AnimatePresence>
                {showActionDiv && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`fixed bottom-0 right-0 left-0 bg-white border-t border-gray-200 shadow-lg z-40 transition-all duration-300 ease-in-out ${isMinimized ? 'md:left-20' : 'md:left-72'}`}
                    >
                        <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-4">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <FiMail className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-gray-800">
                                            {selectedClients.length} client(s) selected for payment reminder
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleSelectAll(false)}
                                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                                <motion.button
                                    onClick={handlePaymentReminder}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiSend className="w-4 h-4" />
                                    Send Payment Reminder
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Firm Info Modal */}
            {showFirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
                    >
                        <div className="sticky top-0 bg-indigo-600 text-white border-b border-indigo-200 px-6 py-4 z-10 rounded-t-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h5 className="text-xl font-bold">Firm Information</h5>
                                    <p className="text-indigo-200 text-sm mt-1">View firm details</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowFirmModal(false);
                                        setSelectedFirm(null);
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
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Firm Name</div>
                                        <div className="text-sm font-bold text-gray-900">{selectedFirm?.firm_name}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">PAN Number</div>
                                        <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded-lg border border-gray-200">{selectedFirm?.pan}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">GST</div>
                                            <div className="text-sm text-gray-900">{selectedFirm?.gst || '---'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">TAN</div>
                                            <div className="text-sm text-gray-900">{selectedFirm?.tan || '---'}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">File No</div>
                                        <div className="text-sm text-gray-900 bg-blue-50 text-blue-700 p-2 rounded-lg border border-blue-200 font-bold">{selectedFirm?.file_no}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Firm Type</div>
                                        <div className="text-sm text-gray-900">{formatFirmType(selectedFirm?.firm_type)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-6 rounded-b-lg">
                            <div className="flex gap-3 justify-end">
                                <a
                                    href={`/view-firm?username=${selectedFirm?.username}&firm_id=${selectedFirm?.firm_id}`}
                                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <FiEye className="w-4 h-4" />
                                    View Firm
                                </a>
                                <a
                                    href={`/edit-firm?username=${selectedFirm?.username}&firm_id=${selectedFirm?.firm_id}`}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <FiEdit className="w-4 h-4" />
                                    Edit Firm
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ViewInactiveClients;