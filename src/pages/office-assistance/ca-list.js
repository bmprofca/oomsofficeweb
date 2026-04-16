import React, { useState, useEffect, useRef } from 'react';
import {
    FiSearch,
    FiPlus,
    FiEdit,
    FiMenu,
    FiPrinter,
    FiMail,
    FiMessageSquare,
    FiUser,
    FiPhone,
    FiMail as FiEmailIcon,
    FiCalendar,
    FiClock,
    FiX,
    FiChevronRight,
    FiChevronDown,
    FiCheck,
    FiInfo,
    FiDollarSign,
    FiTrendingUp,
    FiCreditCard,
    FiFilter,
    FiChevronLeft,
    FiChevronRight as FiChevronRightIcon,
    FiChevronUp,
    FiUsers,
    FiExternalLink,
    FiCheckCircle,
    FiXCircle,
    FiPercent
} from 'react-icons/fi';
import { PiExportBold } from "react-icons/pi";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import DateFilter from '../../components/DateFilter';
import moment from 'moment';

const CAList = () => {
    // Header/Sidebar states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    // Main states
    const [loading, setLoading] = useState(false);
    const [caList, setCaList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [fromToDate, setFromToDate] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCA, setSelectedCA] = useState(null);
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [genders, setGenders] = useState([]);

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState('');

    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [selectedWhatsapp, setSelectedWhatsapp] = useState('');

    // Form states
    const [createForm, setCreateForm] = useState({
        name: '',
        guardian_name: '',
        mobile: '',
        email: '',
        dob: '',
        gender: '',
        state: '',
        dist: '',
        town: '',
        pincode: '',
        address_line_1: '',
        address_line_2: ''
    });

    const [editForm, setEditForm] = useState({
        username: '',
        name: '',
        guardian_name: '',
        mobile: '',
        email: '',
        dob: '',
        gender: '',
        state: '',
        dist: '',
        town: '',
        pincode: '',
        address_line_1: '',
        address_line_2: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);

    // Mock CA data
    const mockCAData = [
        {
            username: 'ca001',
            name: 'Rajesh Kumar',
            guardian_name: 'Suresh Kumar',
            mobile: '+91 9876543210',
            email: 'rajesh.kumar@ca.com',
            balance: 25000.50,
            loan: 5000.00,
            designation: 'Chartered Accountant',
            status: 1,
            created_date: '2024-01-15',
            updated_date: '2024-01-20'
        },
        {
            username: 'ca002',
            name: 'Priya Sharma',
            guardian_name: 'Ramesh Sharma',
            mobile: '+91 9876543211',
            email: 'priya.sharma@ca.com',
            balance: -1500.00,
            loan: 10000.00,
            designation: 'Tax Consultant',
            status: 1,
            created_date: '2024-01-10',
            updated_date: '2024-01-18'
        },
        {
            username: 'ca003',
            name: 'Amit Patel',
            guardian_name: 'Dinesh Patel',
            mobile: '+91 9876543212',
            email: 'amit.patel@ca.com',
            balance: 50000.75,
            loan: 0.00,
            designation: 'Audit Manager',
            status: 0,
            created_date: '2024-01-05',
            updated_date: '2024-01-12'
        },
        {
            username: 'ca004',
            name: 'Sneha Gupta',
            guardian_name: 'Anil Gupta',
            mobile: '+91 9876543213',
            email: 'sneha.gupta@ca.com',
            balance: 12000.00,
            loan: 2000.00,
            designation: 'GST Practitioner',
            status: 1,
            created_date: '2024-01-20',
            updated_date: '2024-01-25'
        },
        {
            username: 'ca005',
            name: 'Vikram Singh',
            guardian_name: 'Rajendra Singh',
            mobile: '+91 9876543214',
            email: 'vikram.singh@ca.com',
            balance: -5000.25,
            loan: 15000.00,
            designation: 'Financial Advisor',
            status: 1,
            created_date: '2024-01-18',
            updated_date: '2024-01-22'
        },
        {
            username: 'ca006',
            name: 'Anjali Mehta',
            guardian_name: 'Sanjay Mehta',
            mobile: '+91 9876543215',
            email: 'anjali.mehta@ca.com',
            balance: 35000.00,
            loan: 0.00,
            designation: 'Company Secretary',
            status: 1,
            created_date: '2024-01-12',
            updated_date: '2024-01-19'
        },
        {
            username: 'ca007',
            name: 'Rahul Verma',
            guardian_name: 'Amit Verma',
            mobile: '+91 9876543216',
            email: 'rahul.verma@ca.com',
            balance: 8000.00,
            loan: 3000.00,
            designation: 'Cost Accountant',
            status: 1,
            created_date: '2024-01-08',
            updated_date: '2024-01-15'
        },
        {
            username: 'ca008',
            name: 'Neha Reddy',
            guardian_name: 'Kumar Reddy',
            mobile: '+91 9876543217',
            email: 'neha.reddy@ca.com',
            balance: -7500.50,
            loan: 12000.00,
            designation: 'Tax Auditor',
            status: 0,
            created_date: '2024-01-25',
            updated_date: '2024-01-30'
        }
    ];

    // Mock states and districts data
    const mockStatesData = {
        states: [
            {
                state: "Delhi",
                districts: ["New Delhi", "Central Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"]
            },
            {
                state: "Maharashtra",
                districts: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"]
            },
            {
                state: "Karnataka",
                districts: ["Bangalore", "Mysore", "Hubli", "Belgaum", "Mangalore", "Gulbarga"]
            },
            {
                state: "Tamil Nadu",
                districts: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Erode"]
            },
            {
                state: "Uttar Pradesh",
                districts: ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Allahabad"]
            }
        ]
    };

    // Mock gender data
    const mockGenders = [
        { value: 'male', name: 'Male' },
        { value: 'female', name: 'Female' },
        { value: 'other', name: 'Other' }
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

    // Initialize with current month date range
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = today;

        const formatDate = (date) => {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '/');
        };

        const from = formatDate(firstDay);
        const to = formatDate(lastDay);

        setDateRange(`${from} - ${to}`);
        setFromToDate(`From ${from} to ${to}`);
        fetchCAData(true);
        loadStatesAndGenders();
    }, []);

    // Load states and genders
    const loadStatesAndGenders = () => {
        setStates(mockStatesData.states);
        setGenders(mockGenders);
        
        // Set default state and load its districts
        if (mockStatesData.states.length > 0) {
            const defaultState = mockStatesData.states[0].state;
            setCreateForm(prev => ({ ...prev, state: defaultState }));
            setEditForm(prev => ({ ...prev, state: defaultState }));
            loadDistricts(defaultState);
        }
    };

    // Load districts for selected state
    const loadDistricts = (stateName) => {
        const state = mockStatesData.states.find(s => s.state === stateName);
        if (state) {
            setDistricts(state.districts);
            
            // Set default district
            if (state.districts.length > 0) {
                setCreateForm(prev => ({ ...prev, dist: state.districts[0] }));
                setEditForm(prev => ({ ...prev, dist: state.districts[0] }));
            }
        }
    };

    // Simulate API call to fetch CA data
    const fetchCAData = async (from = '', to = '') => {
        setLoading(true);

        setTimeout(() => {
            let filteredData = mockCAData;

            // Filter by date range if provided
            if (from && to) {
                filteredData = mockCAData.filter(item => {
                    const createdDate = moment(item.created_date);
                    const fromDate = moment(from, 'DD/MM/YYYY');
                    const toDate = moment(to, 'DD/MM/YYYY');
                    return createdDate.isBetween(fromDate, toDate, null, '[]');
                });
            }

            // Filter by search query
            if (searchQuery) {
                filteredData = filteredData.filter(item =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.mobile.includes(searchQuery) ||
                    item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.designation.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            setCaList(filteredData);
            setLoading(false);
        }, 1000);
    };

    // Handle search
    const handleSearch = () => {
        const [from, to] = dateRange.split(' - ');
        fetchCAData(from, to);
    };

    // Handle search input change with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== '') {
                handleSearch();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Handle key press in search input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        console.log('Selected filter:', filter);
        if (filter.range) {
            setDateRange(filter.range);
            const [from, to] = filter.range.split(' - ');
            setFromToDate(`From ${from} to ${to}`);
            fetchCAData(from, to);
        }
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });

        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            alert(`${type.toUpperCase()} export completed successfully!`);
        }, 1500);
    };

    const handleEmailSubmit = (email) => {
        setSelectedEmail(email);
        setIsEmailModalOpen(false);
        console.log('Selected email:', email);
    };

    const handleWhatsappSubmit = (number) => {
        setSelectedWhatsapp(number);
        setWhatsappModalOpen(false);
        console.log('Selected number:', number);
    };

    // Handle edit button click
    const handleEditClick = (ca) => {
        setSelectedCA(ca);
        setEditForm({
            username: ca.username,
            name: ca.name,
            guardian_name: ca.guardian_name,
            mobile: ca.mobile,
            email: ca.email,
            dob: '',
            gender: 'male',
            state: states[0]?.state || '',
            dist: districts[0] || '',
            town: '',
            pincode: '',
            address_line_1: '',
            address_line_2: ''
        });
        setShowEditModal(true);
    };

    // Handle create form submit
    const handleCreateSubmit = (e) => {
        e.preventDefault();
        console.log('Create form data:', createForm);
        
        // Add new CA to the list
        const newCA = {
            username: `ca${String(caList.length + 1).padStart(3, '0')}`,
            name: createForm.name,
            guardian_name: createForm.guardian_name,
            mobile: createForm.mobile,
            email: createForm.email,
            balance: 0.00,
            loan: 0.00,
            designation: 'Chartered Accountant',
            status: 1,
            created_date: new Date().toISOString().split('T')[0],
            updated_date: new Date().toISOString().split('T')[0]
        };
        
        setCaList(prev => [newCA, ...prev]);
        
        // Close modal and reset form
        setShowCreateModal(false);
        resetCreateForm();
        const [from, to] = dateRange.split(' - ');
        fetchCAData(from, to);
    };

    // Handle edit form submit
    const handleEditSubmit = (e) => {
        e.preventDefault();
        console.log('Edit form data:', editForm);
        
        // Update CA in the list
        setCaList(prev => prev.map(ca =>
            ca.username === editForm.username
                ? { 
                    ...ca, 
                    name: editForm.name,
                    guardian_name: editForm.guardian_name,
                    mobile: editForm.mobile,
                    email: editForm.email,
                    updated_date: new Date().toISOString().split('T')[0]
                }
                : ca
        ));
        
        // Close modal
        setShowEditModal(false);
        const [from, to] = dateRange.split(' - ');
        fetchCAData(from, to);
    };

    // Handle status change
    const handleStatusChange = (ca) => {
        console.log('Changing status for CA:', ca.username);
        
        // Update status in the list
        setCaList(prev => prev.map(c =>
            c.username === ca.username
                ? { ...c, status: c.status === 1 ? 0 : 1, updated_date: new Date().toISOString().split('T')[0] }
                : c
        ));
    };

    // Handle form changes
    const handleCreateChange = (field, value) => {
        const newForm = { ...createForm, [field]: value };
        
        if (field === 'state') {
            loadDistricts(value);
            newForm.dist = districts[0] || '';
        }
        
        setCreateForm(newForm);
    };

    const handleEditChange = (field, value) => {
        const newForm = { ...editForm, [field]: value };
        
        if (field === 'state') {
            loadDistricts(value);
            newForm.dist = districts[0] || '';
        }
        
        setEditForm(newForm);
    };

    // Reset create form
    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            guardian_name: '',
            mobile: '',
            email: '',
            dob: '',
            gender: 'male',
            state: states[0]?.state || '',
            dist: districts[0] || '',
            town: '',
            pincode: '',
            address_line_1: '',
            address_line_2: ''
        });
    };

    // Get user profile link
    const getUserProfileLink = (ca) => {
        return `/view-ca-profile?username=${ca.username}`;
    };

    // Get ledger link
    const getLedgerLink = (ca) => {
        return `/view-ca-profile-ledger?username=${ca.username}`;
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        return status === 1 
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            : 'bg-rose-100 text-rose-700 border border-rose-200';
    };

    // Get balance badge class
    const getBalanceBadgeClass = (balance) => {
        return balance < 0 
            ? 'bg-rose-100 text-rose-700 border border-rose-200'
            : 'bg-emerald-100 text-emerald-700 border border-emerald-200';
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

    // Toggle row dropdown
    const toggleRowDropdown = (caId) => {
        setActiveRowDropdown(activeRowDropdown === caId ? null : caId);
    };

    // Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setShowAddDropdown(false);
                setActiveRowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Get current items based on pagination
    const indexOfLastItem = showAll ? caList.length : currentPage * itemsPerPage;
    const indexOfFirstItem = showAll ? 0 : (currentPage - 1) * itemsPerPage;
    const currentItems = caList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(caList.length / itemsPerPage);

    // Handle user profile click
    const handleUserProfileClick = (e, ca) => {
        e.preventDefault();
        const profileLink = getUserProfileLink(ca);
        console.log('Navigating to profile:', profileLink);
        window.open(profileLink, '_blank');
    };

    // Handle ledger click
    const handleLedgerClick = (e, ca) => {
        e.preventDefault();
        const ledgerLink = getLedgerLink(ca);
        console.log('Navigating to ledger:', ledgerLink);
        window.open(ledgerLink, '_blank');
    };

    // Calculate summary
    const summary = {
        totalCA: caList.length,
        activeCA: caList.filter(ca => ca.status === 1).length,
        totalBalance: caList.reduce((sum, ca) => sum + ca.balance, 0),
        totalLoan: caList.reduce((sum, ca) => sum + ca.loan, 0)
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="flex items-center justify-center">
                    <div className="h-8 w-8 bg-slate-200 rounded-full mr-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                </div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div>
            </td>
            <td className="p-3 text-center">
                <div className="h-6 bg-slate-200 rounded w-8 mx-auto"></div>
            </td>
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
                        {/* Skeleton Header */}
                        <div className="border-b border-slate-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="h-10 bg-gray-200 rounded w-40"></div>
                                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                                </div>
                            </div>
                        </div>

                        {/* Skeleton Table */}
                        <div className="overflow-hidden">
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            {[...Array(7)].map((_, i) => (
                                                <th key={i} className="text-center p-3">
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
    if (loading && caList.length === 0) {
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
                    {/* Header Stats Cards - Professional Compact Design */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total CA</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">{summary.totalCA}</h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                                    <FiUsers className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">All Chartered Accountants</span>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Active</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">{summary.activeCA}</h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg">
                                    <FiCheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">Currently active accounts</span>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.2 }}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Balance</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">
                                        ₹{formatCurrency(summary.totalBalance)}
                                    </h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg">
                                    <FiDollarSign className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">Overall account balance</span>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.3 }}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Loan</p>
                                    <h3 className="text-xl font-bold text-slate-800 mt-1">
                                        ₹{formatCurrency(summary.totalLoan)}
                                    </h3>
                                </div>
                                <div className="p-2 bg-gradient-to-r from-amber-100 to-amber-200 rounded-lg">
                                    <FiTrendingUp className="w-5 h-5 text-amber-600" />
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 font-medium">Outstanding loan amount</span>
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
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                                            <FiUser className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h5 className="text-lg font-bold text-slate-800">
                                                Chartered Accountants
                                            </h5>
                                            {fromToDate && (
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <FiCalendar className="w-3 h-3" />
                                                    <p className="text-xs font-medium">
                                                        {fromToDate}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Search by name, mobile, email..."
                                            className="pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full lg:w-64"
                                        />
                                    </div>

                                    {/* Date Filter Component */}
                                    <div className="w-full lg:w-auto">
                                        <DateFilter onChange={handleDateFilterChange} />
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Export Dropdown */}
                                        <div className="dropdown-container relative">
                                            <motion.button
                                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <PiExportBold className="w-4 h-4" />
                                                Export
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
                                                                    <PiFilePdfDuotone className="w-3.5 h-3.5 text-red-500" />
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
                                                                    <PiMicrosoftExcelLogoDuotone className="w-3.5 h-3.5 text-green-500" />
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
                                                                    <FaWhatsapp className="w-3.5 h-3.5 text-green-500" />
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
                                                                    <AiOutlineMail className="w-3.5 h-3.5 text-blue-500" />
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
                                            <FiPlus className="w-4 h-4" />
                                           
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
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[60px]">
                                            Sl No
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[180px]">
                                            CA Details
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">
                                            Contact Info
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">
                                            Account
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[140px]">
                                            Balance
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                                            Status
                                        </th>
                                        <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {caList.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                        <FiUser className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium mb-1">No CA records found</p>
                                                    <p className="text-slate-500 text-xs mb-4">Start by creating your first CA entry</p>
                                                    <motion.button
                                                        onClick={() => setShowCreateModal(true)}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow transition-all duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Your First CA
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((ca, index) => {
                                            const isDropdownOpen = activeRowDropdown === ca.username;
                                            const actualIndex = showAll ? index : (currentPage - 1) * itemsPerPage + index;
                                            const profileLink = getUserProfileLink(ca);
                                            const ledgerLink = getLedgerLink(ca);

                                            return (
                                                <motion.tr
                                                    key={ca.username}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="hover:bg-blue-50/20 transition-colors duration-150"
                                                >
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="text-slate-700 font-medium text-xs">
                                                            {actualIndex + 1}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <motion.a
                                                            href={profileLink}
                                                            onClick={(e) => handleUserProfileClick(e, ca)}
                                                            className="inline-flex items-center justify-center gap-2 group cursor-pointer no-underline"
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                        >
                                                            <div className="relative">
                                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-blue-300 transition-colors">
                                                                    <FiUser className="w-4 h-4 text-blue-600" />
                                                                </div>
                                                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                                                                    <FiExternalLink className="w-2.5 h-2.5 text-blue-500" />
                                                                </div>
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-slate-800 font-semibold text-xs group-hover:text-blue-600 transition-colors">
                                                                    {ca.name}
                                                                </div>
                                                                <div className="text-slate-600 text-[10px] mt-0.5">
                                                                    C/O: {ca.guardian_name}
                                                                </div>
                                                                <div className="mt-1">
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 group-hover:bg-purple-200 transition-colors">
                                                                        {ca.designation}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.a>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-center gap-1 text-slate-700 text-xs">
                                                                <FiPhone className="w-3 h-3 text-slate-500" />
                                                                {ca.mobile}
                                                            </div>
                                                            <div className="flex items-center justify-center gap-1 text-slate-600 text-[10px]">
                                                                <FiEmailIcon className="w-3 h-3 text-slate-500" />
                                                                {ca.email}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="space-y-2">
                                                            <div className="text-slate-700 text-xs">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <FiCalendar className="w-3 h-3 text-slate-500" />
                                                                    Created: {formatDate(ca.created_date)}
                                                                </div>
                                                            </div>
                                                            <motion.a
                                                                href={ledgerLink}
                                                                onClick={(e) => handleLedgerClick(e, ca)}
                                                                className="inline-flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-300/50 shadow-xs hover:from-slate-200 hover:to-slate-300 transition-all duration-200 group cursor-pointer"
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                            >
                                                                <FiPercent className="w-3 h-3 mr-1 group-hover:rotate-12 transition-transform" />
                                                                View Ledger
                                                            </motion.a>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="space-y-2">
                                                            <motion.a
                                                                href={ledgerLink}
                                                                onClick={(e) => handleLedgerClick(e, ca)}
                                                                className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg min-w-[100px] shadow-xs hover:shadow transition-all duration-200 ${getBalanceBadgeClass(ca.balance)} cursor-pointer`}
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                            >
                                                                ₹{formatCurrency(Math.abs(ca.balance))}
                                                                {ca.balance < 0 && <FiTrendingUp className="w-3 h-3 ml-1" />}
                                                            </motion.a>
                                                            {/* {ca.loan > 0 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                                                                    <FiCreditCard className="w-2.5 h-2.5" />
                                                                    ₹{formatCurrency(ca.loan)} Loan
                                                                </span>
                                                            )} */}
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <label className="relative inline-flex items-center cursor-pointer justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={ca.status === 1}
                                                                onChange={() => handleStatusChange(ca)}
                                                                className="sr-only peer"
                                                            />
                                                            <div className={`w-14 h-7 rounded-full peer ${ca.status === 1 ? 'bg-emerald-500' : 'bg-slate-300'} peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all after:border after:border-slate-300`}>
                                                                {ca.status === 1 ? (
                                                                    <FiCheck className="absolute left-1.5 top-1.5 w-3 h-3 text-white z-10" />
                                                                ) : (
                                                                    <FiX className="absolute right-1.5 top-1.5 w-3 h-3 text-slate-500 z-10" />
                                                                )}
                                                            </div>
                                                        </label>
                                                    </td>
                                                    <td className="text-center p-3 align-middle">
                                                        <div className="dropdown-container relative flex justify-center">
                                                            <motion.button
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 border border-slate-200 hover:border-blue-300"
                                                                onClick={() => toggleRowDropdown(ca.username)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <FiMenu className="w-3.5 h-3.5" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {isDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 5 }}
                                                                        className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
                                                                    >
                                                                        <div className="py-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveRowDropdown(null);
                                                                                    handleEditClick(ca);
                                                                                }}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                            >
                                                                                <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                    <FiEdit className="w-3 h-3 text-blue-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">Edit CA</div>
                                                                                </div>
                                                                            </button>
                                                                            <a
                                                                                href={profileLink}
                                                                                onClick={(e) => {
                                                                                    setActiveRowDropdown(null);
                                                                                    handleUserProfileClick(e, ca);
                                                                                }}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                            >
                                                                                <div className="p-1 bg-emerald-50 rounded mr-2">
                                                                                    <FiUser className="w-3 h-3 text-emerald-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">View Profile</div>
                                                                                </div>
                                                                            </a>
                                                                            <a
                                                                                href={ledgerLink}
                                                                                onClick={(e) => {
                                                                                    setActiveRowDropdown(null);
                                                                                    handleLedgerClick(e, ca);
                                                                                }}
                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                            >
                                                                                <div className="p-1 bg-purple-50 rounded mr-2">
                                                                                    <FiPercent className="w-3 h-3 text-purple-500" />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="font-medium">View Ledger</div>
                                                                                </div>
                                                                            </a>
                                                                            <div className="border-t border-slate-100 mt-1 pt-1">
                                                                                <button
                                                                                    onClick={() => handleExport('print', ca)}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-slate-50 rounded mr-2">
                                                                                        <FiPrinter className="w-3 h-3 text-slate-600" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Print</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleExport('whatsapp', ca)}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-green-50 rounded mr-2">
                                                                                        <FiMessageSquare className="w-3 h-3 text-green-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">WhatsApp</div>
                                                                                    </div>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleExport('email', ca)}
                                                                                    className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors duration-150"
                                                                                >
                                                                                    <div className="p-1 bg-blue-50 rounded mr-2">
                                                                                        <FiMail className="w-3 h-3 text-blue-500" />
                                                                                    </div>
                                                                                    <div className="text-left">
                                                                                        <div className="font-medium">Email</div>
                                                                                    </div>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {caList.length > itemsPerPage && !showAll && (
                                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-3">
                                        <div className="text-xs text-slate-600">
                                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, caList.length)} of {caList.length} entries
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
                            {showAll && caList.length > itemsPerPage && (
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

                            {/* Footer Summary */}
                            <div className="border-t border-slate-200">
                                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white">
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                        <div className="text-xs text-slate-600">
                                            <span className="font-semibold text-slate-800">Summary:</span> Total {summary.totalCA} CAs • 
                                            <span className="text-emerald-600 font-medium ml-2">Active: {summary.activeCA}</span> • 
                                            <span className="text-rose-600 font-medium ml-2">Inactive: {summary.totalCA - summary.activeCA}</span> • 
                                            <span className="text-emerald-600 font-medium ml-2">Balance: ₹{formatCurrency(summary.totalBalance)}</span> • 
                                            <span className="text-amber-600 font-medium ml-2">Loan: ₹{formatCurrency(summary.totalLoan)}</span>
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            Data updated: {moment().format('DD/MM/YYYY HH:mm')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Create CA Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-white rounded-xl p-6 max-w-4xl w-full mx-auto shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 sticky top-0 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg">
                                        <FiPlus className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Create New CA</h3>
                                        <p className="text-slate-600 text-xs mt-1">Fill in the details to create a new Chartered Accountant entry</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetCreateForm();
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-150 text-slate-500 hover:text-slate-700"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.name}
                                            onChange={(e) => handleCreateChange('name', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Enter Name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Guardian's Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.guardian_name}
                                            onChange={(e) => handleCreateChange('guardian_name', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Enter Father's Name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Mobile Number <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={createForm.mobile}
                                            onChange={(e) => handleCreateChange('mobile', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Enter Mobile Number"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={createForm.dob}
                                            onChange={(e) => handleCreateChange('dob', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Gender
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={createForm.gender}
                                                onChange={(e) => handleCreateChange('gender', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors appearance-none bg-white"
                                            >
                                                {genders.map(gender => (
                                                    <option key={gender.value} value={gender.value}>
                                                        {gender.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Email <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) => handleCreateChange('email', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="example@gmail.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            State
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={createForm.state}
                                                onChange={(e) => handleCreateChange('state', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors appearance-none bg-white"
                                            >
                                                {states.map(state => (
                                                    <option key={state.state} value={state.state}>
                                                        {state.state}
                                                    </option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            District
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={createForm.dist}
                                                onChange={(e) => handleCreateChange('dist', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors appearance-none bg-white"
                                            >
                                                {districts.map(district => (
                                                    <option key={district} value={district}>
                                                        {district}
                                                    </option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Village/Town <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.town}
                                            onChange={(e) => handleCreateChange('town', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Village/Town"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Pin Code <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={createForm.pincode}
                                            onChange={(e) => handleCreateChange('pincode', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Pin code"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Address Line 1
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.address_line_1}
                                            onChange={(e) => handleCreateChange('address_line_1', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Address Line 1"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Address Line 2
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.address_line_2}
                                            onChange={(e) => handleCreateChange('address_line_2', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Address Line 2"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200 sticky bottom-0 bg-white">
                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            resetCreateForm();
                                        }}
                                        className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg hover:shadow transition-all duration-200"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Create CA
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit CA Modal */}
            <AnimatePresence>
                {showEditModal && selectedCA && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-white rounded-xl p-6 max-w-4xl w-full mx-auto shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 sticky top-0 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                                        <FiEdit className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Update CA</h3>
                                        <p className="text-slate-600 text-xs mt-1">Modify the details of the selected Chartered Accountant</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedCA(null);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-150 text-slate-500 hover:text-slate-700"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit}>
                                <input type="hidden" name="username" value={editForm.username} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => handleEditChange('name', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Enter Name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Guardian's Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.guardian_name}
                                            onChange={(e) => handleEditChange('guardian_name', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Enter Father's Name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Mobile Number <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={editForm.mobile}
                                            onChange={(e) => handleEditChange('mobile', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Enter Mobile Number"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={editForm.dob}
                                            onChange={(e) => handleEditChange('dob', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Gender
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={editForm.gender}
                                                onChange={(e) => handleEditChange('gender', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors appearance-none bg-white"
                                            >
                                                {genders.map(gender => (
                                                    <option key={gender.value} value={gender.value}>
                                                        {gender.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Email <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => handleEditChange('email', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="example@gmail.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            State
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={editForm.state}
                                                onChange={(e) => handleEditChange('state', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors appearance-none bg-white"
                                            >
                                                {states.map(state => (
                                                    <option key={state.state} value={state.state}>
                                                        {state.state}
                                                    </option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            District
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={editForm.dist}
                                                onChange={(e) => handleEditChange('dist', e.target.value)}
                                                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors appearance-none bg-white"
                                            >
                                                {districts.map(district => (
                                                    <option key={district} value={district}>
                                                        {district}
                                                    </option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Village/Town <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.town}
                                            onChange={(e) => handleEditChange('town', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Village/Town"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Pin Code <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={editForm.pincode}
                                            onChange={(e) => handleEditChange('pincode', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Pin code"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Address Line 1
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.address_line_1}
                                            onChange={(e) => handleEditChange('address_line_1', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Address Line 1"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                                            Address Line 2
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.address_line_2}
                                            onChange={(e) => handleEditChange('address_line_2', e.target.value)}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-colors"
                                            placeholder="Address Line 2"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200 sticky bottom-0 bg-white">
                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setSelectedCA(null);
                                        }}
                                        className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:shadow transition-all duration-200"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Update CA
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Export Confirmation Modal */}
            <AnimatePresence>
                {exportModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PiExportBold className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">
                                    Exporting {exportModal.type.toUpperCase()}
                                </h3>
                                <p className="text-slate-600 mb-6 text-sm">
                                    Your {exportModal.type} export is being processed...
                                </p>
                                <div className="flex justify-center space-x-2 mb-6">
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    This will only take a moment...
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CAList;