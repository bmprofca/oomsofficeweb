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
import axios from 'axios';
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";

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
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        total_pages: 1,
        is_last_page: true
    });

    // State for dropdown menus
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeRowDropdown, setActiveRowDropdown] = useState(null);
    const [exportModal, setExportModal] = useState({ open: false, type: '', data: null });
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState('');

    const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [selectedWhatsapp, setSelectedWhatsapp] = useState('');

    // Form states
    const [createForm, setCreateForm] = useState({
        name: '',
        guardian_name: '',
        mobile: '',
        country_code: '+91',
        email: '',
        date_of_birth: '',
        gender: '',
        state: '',
        district: '',
        village_town: '',
        pincode: '',
        address_line_1: '',
        address_line_2: '',
        branch_id: '123456'
    });

    const [editForm, setEditForm] = useState({
        username: '',
        name: '',
        guardian_name: '',
        mobile: '',
        country_code: '+91',
        email: '',
        date_of_birth: '',
        gender: '',
        state: '',
        district: '',
        village_town: '',
        pincode: '',
        address_line_1: '',
        address_line_2: '',
        branch_id: '123456'
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);

    const BRANCH_ID = '123456';

    // Show toast notification
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: '' });
        }, 3000);
    };

    // Fetch CA list from API
    const fetchCAData = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const headers = await getHeaders();
            const response = await axios.get(`${API_BASE_URL}/ca/list`, {
                params: {
                    branch_id: BRANCH_ID,
                    page: page,
                    limit: itemsPerPage,
                    search: search || undefined
                },
                headers: headers
            });

            if (response.data.success) {
                setCaList(response.data.data);
                setPagination(response.data.pagination);
            } else {
                showToast(response.data.message || 'Failed to fetch CA list', 'error');
            }
        } catch (error) {
            console.error('Error fetching CA list:', error);
            showToast(error.response?.data?.message || 'Error connecting to server', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Search CA
    const handleSearch = async () => {
        setCurrentPage(1);
        await fetchCAData(1, searchQuery);
    };

    // Handle search input change with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== '') {
                handleSearch();
            } else if (searchQuery === '') {
                fetchCAData(1, '');
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

    // Load states and genders
    const loadStatesAndGenders = async () => {
        // Mock states data - in production, fetch from API
        const mockStatesData = {
            states: [
                { state: "Andhra Pradesh", districts: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool"] },
                { state: "Assam", districts: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon"] },
                { state: "Bihar", districts: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"] },
                { state: "Delhi", districts: ["New Delhi", "Central Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"] },
                { state: "Gujarat", districts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"] },
                { state: "Haryana", districts: ["Faridabad", "Gurugram", "Panipat", "Ambala", "Hisar"] },
                { state: "Karnataka", districts: ["Bangalore", "Mysore", "Hubli", "Belgaum", "Mangalore"] },
                { state: "Kerala", districts: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"] },
                { state: "Madhya Pradesh", districts: ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"] },
                { state: "Maharashtra", districts: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik"] },
                { state: "Punjab", districts: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"] },
                { state: "Rajasthan", districts: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"] },
                { state: "Tamil Nadu", districts: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"] },
                { state: "Telangana", districts: ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar"] },
                { state: "Uttar Pradesh", districts: ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut"] },
                { state: "West Bengal", districts: ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Durgapur"] }
            ]
        };
        
        setStates(mockStatesData.states);
        
        const mockGenders = [
            { value: 'male', name: 'Male' },
            { value: 'female', name: 'Female' },
            { value: 'other', name: 'Other' }
        ];
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
        const state = states.find(s => s.state === stateName);
        if (state && state.districts) {
            setDistricts(state.districts);
            
            // Set default district
            if (state.districts.length > 0) {
                setCreateForm(prev => ({ ...prev, district: state.districts[0] }));
                setEditForm(prev => ({ ...prev, district: state.districts[0] }));
            }
        } else {
            setDistricts([]);
        }
    };

    // Handle date filter change
    const handleDateFilterChange = (filter) => {
        console.log('Selected filter:', filter);
        // Implement date filtering logic
    };

    // Handle export
    const handleExport = (type, data = null) => {
        setExportModal({ open: true, type, data });

        setTimeout(() => {
            setExportModal({ open: false, type: '', data: null });
            showToast(`${type.toUpperCase()} export completed successfully!`, 'success');
        }, 1500);
    };

    // Create new CA
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const headers = await getHeaders();
            const response = await axios.post(`${API_BASE_URL}/ca/create`, createForm, {
                headers: headers
            });
            
            if (response.data.success) {
                showToast('CA created successfully!', 'success');
                setShowCreateModal(false);
                resetCreateForm();
                await fetchCAData(currentPage, searchQuery);
            } else {
                showToast(response.data.message || 'Failed to create CA', 'error');
            }
        } catch (error) {
            console.error('Error creating CA:', error);
            showToast(error.response?.data?.message || 'Error creating CA. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Edit CA
    const handleEditClick = (ca) => {
        setSelectedCA(ca);
        setEditForm({
            username: ca.username,
            name: ca.name || '',
            guardian_name: ca.guardian_name || '',
            mobile: ca.mobile || '',
            country_code: ca.country_code || '+91',
            email: ca.email || '',
            date_of_birth: ca.date_of_birth ? moment(ca.date_of_birth).format('YYYY-MM-DD') : '',
            gender: ca.gender || '',
            state: ca.state || '',
            district: ca.district || '',
            village_town: ca.village_town || '',
            pincode: ca.pincode || '',
            address_line_1: ca.address_line_1 || '',
            address_line_2: ca.address_line_2 || '',
            branch_id: BRANCH_ID
        });
        
        // Load districts for selected state
        if (ca.state) {
            loadDistricts(ca.state);
        }
        
        setShowEditModal(true);
    };

    // Update CA
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const headers = await getHeaders();
            const response = await axios.put(`${API_BASE_URL}/ca/update/${editForm.username}`, editForm, {
                headers: headers
            });
            
            if (response.data.success) {
                showToast('CA updated successfully!', 'success');
                setShowEditModal(false);
                setSelectedCA(null);
                await fetchCAData(currentPage, searchQuery);
            } else {
                showToast(response.data.message || 'Failed to update CA', 'error');
            }
        } catch (error) {
            console.error('Error updating CA:', error);
            showToast(error.response?.data?.message || 'Error updating CA. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle status change
    const handleStatusChange = async (ca) => {
        try {
            const newStatus = ca.status === '1' ? '0' : '1';
            const headers = await getHeaders();
            const response = await axios.patch(`${API_BASE_URL}/ca/status/${ca.username}`, {
                status: newStatus,
                branch_id: BRANCH_ID
            }, {
                headers: headers
            });
            
            if (response.data.success) {
                showToast(`CA ${newStatus === '1' ? 'activated' : 'deactivated'} successfully!`, 'success');
                await fetchCAData(currentPage, searchQuery);
            } else {
                showToast(response.data.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showToast(error.response?.data?.message || 'Error updating status. Please try again.', 'error');
        }
    };

    // Handle form changes
    const handleCreateChange = (field, value) => {
        const newForm = { ...createForm, [field]: value };
        
        if (field === 'state') {
            loadDistricts(value);
            newForm.district = districts[0] || '';
        }
        
        setCreateForm(newForm);
    };

    const handleEditChange = (field, value) => {
        const newForm = { ...editForm, [field]: value };
        
        if (field === 'state') {
            loadDistricts(value);
            newForm.district = districts[0] || '';
        }
        
        setEditForm(newForm);
    };

    // Reset create form
    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            guardian_name: '',
            mobile: '',
            country_code: '+91',
            email: '',
            date_of_birth: '',
            gender: '',
            state: states[0]?.state || '',
            district: districts[0] || '',
            village_town: '',
            pincode: '',
            address_line_1: '',
            address_line_2: '',
            branch_id: BRANCH_ID
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
        return status === '1' || status === 1
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-gray-50 text-gray-600 border border-gray-200';
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
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

    // Handle page change
    const handlePageChange = async (page) => {
        setCurrentPage(page);
        await fetchCAData(page, searchQuery);
    };

    // Initialize data
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

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

    useEffect(() => {
        fetchCAData(1, '');
        loadStatesAndGenders();
    }, []);

    // Calculate summary
    const summary = {
        totalCA: pagination.total || caList.length,
        activeCA: caList.filter(ca => ca.status === '1' || ca.status === 1).length
    };

    // Skeleton loader component
    const SkeletonRow = () => (
        <tr className="border-b border-gray-100">
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-8"></div>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-28"></div>
                    <div className="h-3 bg-gray-200 rounded w-36"></div>
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
            </td>
            <td className="px-4 py-3">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
            </td>
            <td className="px-4 py-3">
                <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
            </td>
            <td className="px-4 py-3">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </td>
        </tr>
    );

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
            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="bg-white rounded-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="p-6">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="mb-4">
                                    <div className="h-12 bg-gray-100 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading && caList.length === 0) {
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

            {/* Toast Notification */}
            <AnimatePresence>
                {toast.show && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
                            toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {toast.type === 'success' ? (
                                <FiCheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <FiXCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="text-sm">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider">Total CA</p>
                                    <h3 className="text-2xl font-semibold text-gray-800 mt-1">{summary.totalCA}</h3>
                                </div>
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <FiUsers className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider">Active</p>
                                    <h3 className="text-2xl font-semibold text-gray-800 mt-1">{summary.activeCA}</h3>
                                </div>
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <FiCheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider">Inactive</p>
                                    <h3 className="text-2xl font-semibold text-gray-800 mt-1">{summary.totalCA - summary.activeCA}</h3>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <FiXCircle className="w-5 h-5 text-gray-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider">Total Balance</p>
                                    <h3 className="text-2xl font-semibold text-gray-800 mt-1">₹0.00</h3>
                                </div>
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <FiDollarSign className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-lg border border-gray-200">
                        {/* Card Header */}
                        <div className="border-b border-gray-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h5 className="text-lg font-semibold text-gray-800">
                                        Chartered Accountants
                                    </h5>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Manage all CA profiles and their details
                                    </p>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Search by name, mobile, email..."
                                            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full lg:w-80"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Export Dropdown */}
                                        <div className="dropdown-container relative">
                                            <button
                                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                                            >
                                                <PiExportBold className="w-4 h-4" />
                                                Export
                                                <FiChevronDown className={`w-3 h-3 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {showAddDropdown && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 5 }}
                                                        className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                                                    >
                                                        <div className="py-1">
                                                            <button
                                                                onClick={() => handleExport('pdf')}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <PiFilePdfDuotone className="w-4 h-4 mr-2 text-red-500" />
                                                                Export as PDF
                                                            </button>
                                                            <button
                                                                onClick={() => handleExport('excel')}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <PiMicrosoftExcelLogoDuotone className="w-4 h-4 mr-2 text-green-500" />
                                                                Export as Excel
                                                            </button>
                                                            <button
                                                                onClick={() => setWhatsappModalOpen(true)}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <FaWhatsapp className="w-4 h-4 mr-2 text-green-500" />
                                                                WhatsApp
                                                            </button>
                                                            <button
                                                                onClick={() => setIsEmailModalOpen(true)}
                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <AiOutlineMail className="w-4 h-4 mr-2 text-blue-500" />
                                                                Email
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add CA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                            Sl No
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                            CA Details
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                            Contact Info
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                            Created Date
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {caList.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-12 text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <FiUser className="w-12 h-12 text-gray-300 mb-3" />
                                                    <p className="text-gray-600 font-medium mb-1">No CA records found</p>
                                                    <p className="text-gray-500 text-sm">Click "Add CA" to create your first entry</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        caList.map((ca, index) => {
                                            const isDropdownOpen = activeRowDropdown === ca.username;
                                            const profileLink = getUserProfileLink(ca);
                                            const ledgerLink = getLedgerLink(ca);
                                            const serialNo = (currentPage - 1) * itemsPerPage + index + 1;

                                            return (
                                                <tr key={ca.username} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {serialNo}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                                                <FiUser className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <a
                                                                    href={profileLink}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        window.open(profileLink, '_blank');
                                                                    }}
                                                                    className="font-medium text-gray-800 hover:text-blue-600 transition-colors"
                                                                >
                                                                    {ca.name || 'N/A'}
                                                                </a>
                                                                {ca.guardian_name && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                                        C/O: {ca.guardian_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1 text-gray-600 text-sm">
                                                                <FiPhone className="w-3 h-3" />
                                                                {ca.country_code} {ca.mobile}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                                                                <FiEmailIcon className="w-3 h-3" />
                                                                {ca.email || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-gray-600 text-sm">
                                                            {ca.village_town || ca.city || 'N/A'}
                                                            {ca.state && `, ${ca.state}`}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-gray-600 text-sm">
                                                            {formatDate(ca.create_date)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={ca.status === '1' || ca.status === 1}
                                                                onChange={() => handleStatusChange(ca)}
                                                                className="sr-only peer"
                                                            />
                                                            <div className={`w-10 h-5 rounded-full peer ${ca.status === '1' || ca.status === 1 ? 'bg-green-500' : 'bg-gray-300'} peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all`}></div>
                                                            <span className="ml-2 text-xs text-gray-600">
                                                                {ca.status === '1' || ca.status === 1 ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </label>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="dropdown-container relative">
                                                            <button
                                                                className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100"
                                                                onClick={() => toggleRowDropdown(ca.username)}
                                                            >
                                                                <FiMenu className="w-4 h-4" />
                                                            </button>
                                                            <AnimatePresence>
                                                                {isDropdownOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 5 }}
                                                                        className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                                                                    >
                                                                        <div className="py-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveRowDropdown(null);
                                                                                    handleEditClick(ca);
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                                            >
                                                                                <FiEdit className="w-4 h-4 mr-2" />
                                                                                Edit
                                                                            </button>
                                                                            <a
                                                                                href={profileLink}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    setActiveRowDropdown(null);
                                                                                    window.open(profileLink, '_blank');
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                                            >
                                                                                <FiUser className="w-4 h-4 mr-2" />
                                                                                View Profile
                                                                            </a>
                                                                            <a
                                                                                href={ledgerLink}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    setActiveRowDropdown(null);
                                                                                    window.open(ledgerLink, '_blank');
                                                                                }}
                                                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                                            >
                                                                                <FiPercent className="w-4 h-4 mr-2" />
                                                                                Ledger
                                                                            </a>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {!showAll && pagination.total_pages > 1 && (
                                <div className="border-t border-gray-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-600">
                                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} entries
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                                    let pageNum;
                                                    if (pagination.total_pages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= pagination.total_pages - 2) {
                                                        pageNum = pagination.total_pages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => handlePageChange(pageNum)}
                                                            className={`px-3 py-1 text-sm rounded-md ${
                                                                currentPage === pageNum
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'border border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === pagination.total_pages}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create CA Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">Create New CA</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                    <FiX className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.name}
                                            onChange={(e) => handleCreateChange('name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Guardian's Name
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.guardian_name}
                                            onChange={(e) => handleCreateChange('guardian_name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mobile Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={createForm.country_code}
                                                onChange={(e) => handleCreateChange('country_code', e.target.value)}
                                                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="+91">+91 (India)</option>
                                                <option value="+1">+1 (USA)</option>
                                                <option value="+44">+44 (UK)</option>
                                            </select>
                                            <input
                                                type="tel"
                                                value={createForm.mobile}
                                                onChange={(e) => handleCreateChange('mobile', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) => handleCreateChange('email', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={createForm.date_of_birth}
                                            onChange={(e) => handleCreateChange('date_of_birth', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Gender
                                        </label>
                                        <select
                                            value={createForm.gender}
                                            onChange={(e) => handleCreateChange('gender', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">Select Gender</option>
                                            {genders.map(gender => (
                                                <option key={gender.value} value={gender.value}>
                                                    {gender.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            State
                                        </label>
                                        <select
                                            value={createForm.state}
                                            onChange={(e) => handleCreateChange('state', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">Select State</option>
                                            {states.map(state => (
                                                <option key={state.state} value={state.state}>
                                                    {state.state}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            District
                                        </label>
                                        <select
                                            value={createForm.district}
                                            onChange={(e) => handleCreateChange('district', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            disabled={!createForm.state}
                                        >
                                            <option value="">Select District</option>
                                            {districts.map(district => (
                                                <option key={district} value={district}>
                                                    {district}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            City/Village/Town
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.village_town}
                                            onChange={(e) => handleCreateChange('village_town', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.pincode}
                                            onChange={(e) => handleCreateChange('pincode', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address Line 1
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.address_line_1}
                                            onChange={(e) => handleCreateChange('address_line_1', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address Line 2
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.address_line_2}
                                            onChange={(e) => handleCreateChange('address_line_2', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            resetCreateForm();
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Creating...' : 'Create CA'}
                                    </button>
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
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">Edit CA</h3>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedCA(null);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                    <FiX className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => handleEditChange('name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Guardian's Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.guardian_name}
                                            onChange={(e) => handleEditChange('guardian_name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mobile Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={editForm.country_code}
                                                onChange={(e) => handleEditChange('country_code', e.target.value)}
                                                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="+91">+91 (India)</option>
                                                <option value="+1">+1 (USA)</option>
                                                <option value="+44">+44 (UK)</option>
                                            </select>
                                            <input
                                                type="tel"
                                                value={editForm.mobile}
                                                onChange={(e) => handleEditChange('mobile', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => handleEditChange('email', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={editForm.date_of_birth}
                                            onChange={(e) => handleEditChange('date_of_birth', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Gender
                                        </label>
                                        <select
                                            value={editForm.gender}
                                            onChange={(e) => handleEditChange('gender', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">Select Gender</option>
                                            {genders.map(gender => (
                                                <option key={gender.value} value={gender.value}>
                                                    {gender.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            State
                                        </label>
                                        <select
                                            value={editForm.state}
                                            onChange={(e) => handleEditChange('state', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">Select State</option>
                                            {states.map(state => (
                                                <option key={state.state} value={state.state}>
                                                    {state.state}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            District
                                        </label>
                                        <select
                                            value={editForm.district}
                                            onChange={(e) => handleEditChange('district', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            disabled={!editForm.state}
                                        >
                                            <option value="">Select District</option>
                                            {districts.map(district => (
                                                <option key={district} value={district}>
                                                    {district}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            City/Village/Town
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.village_town}
                                            onChange={(e) => handleEditChange('village_town', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Pincode
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.pincode}
                                            onChange={(e) => handleEditChange('pincode', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address Line 1
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.address_line_1}
                                            onChange={(e) => handleEditChange('address_line_1', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address Line 2
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.address_line_2}
                                            onChange={(e) => handleEditChange('address_line_2', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setSelectedCA(null);
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Updating...' : 'Update CA'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Export Modal */}
            <AnimatePresence>
                {exportModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg p-6 max-w-sm w-full text-center"
                        >
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PiExportBold className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                Exporting {exportModal.type.toUpperCase()}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Your {exportModal.type} export is being processed...
                            </p>
                            <div className="flex justify-center gap-1 mb-4">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CAList;