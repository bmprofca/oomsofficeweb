import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiSettings, FiClock, FiUsers, FiCalendar } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';

const AutoReminder = () => {
    // Header/Sidebar states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    // Tab and content states
    const [activeTab, setActiveTab] = useState('whitelist');
    const [loading, setLoading] = useState(false);
    const observer = useRef();

    // Whitelist states
    const [whitelist, setWhitelist] = useState([]);
    const [whitelistPage, setWhitelistPage] = useState(1);
    const [hasMoreWhitelist, setHasMoreWhitelist] = useState(true);
    const [isLoadingMoreWhitelist, setIsLoadingMoreWhitelist] = useState(false);
    const [showCreateWhitelistModal, setShowCreateWhitelistModal] = useState(false);
    const [schedules, setSchedules] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [searchWhitelist, setSearchWhitelist] = useState({
        schedule_id: '',
        query: ''
    });

    // Schedule states
    const [scheduleList, setScheduleList] = useState([]);
    const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
    const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    // Form states
    const [whitelistForm, setWhitelistForm] = useState({
        usernames: [],
        schedule_id: '',
        show_schedule: ''
    });

    const [scheduleForm, setScheduleForm] = useState({
        name: '',
        type: '',
        day: '',
        date: '',
        hour: ''
    });

    const [editScheduleForm, setEditScheduleForm] = useState({
        schedule_id: '',
        name: '',
        type: '',
        day: '',
        date: '',
        hour: '',
        status: '1'
    });

    // Mock data
    const mockWhitelistData = [
        {
            id: '1',
            username: 'client001',
            name: 'Rajesh Kumar',
            guardian_name: 'Suresh Kumar',
            mobile: '+91 9876543210',
            email: 'rajesh@example.com',
            balance: 25000.50,
            schedule_name: 'Daily Morning',
            type: 'daily',
            value_1: '09',
            value_2: ''
        },
        {
            id: '2',
            username: 'client002',
            name: 'Priya Sharma',
            guardian_name: 'Ramesh Sharma',
            mobile: '+91 9876543211',
            email: 'priya@example.com',
            balance: -1500.00,
            schedule_name: 'Weekly Monday',
            type: 'weekly',
            value_1: 'Monday',
            value_2: '10'
        },
        {
            id: '3',
            username: 'client003',
            name: 'Amit Patel',
            guardian_name: 'Dinesh Patel',
            mobile: '+91 9876543212',
            email: 'amit@example.com',
            balance: 50000.75,
            schedule_name: 'Monthly 15th',
            type: 'monthly',
            value_1: '15',
            value_2: '14'
        }
    ];

    const mockScheduleData = [
        {
            schedule_id: '1',
            name: 'Daily Morning',
            type: 'daily',
            value_1: '09',
            value_2: '',
            count: 15,
            status: '1'
        },
        {
            schedule_id: '2',
            name: 'Weekly Monday',
            type: 'weekly',
            value_1: 'Monday',
            value_2: '10',
            count: 8,
            status: '1'
        },
        {
            schedule_id: '3',
            name: 'Monthly 15th',
            type: 'monthly',
            value_1: '15',
            value_2: '14',
            count: 5,
            status: '0'
        }
    ];

    const mockSchedules = [
        { schedule_id: '1', name: 'Daily Morning', type: 'daily', value_1: '09', value_2: '' },
        { schedule_id: '2', name: 'Weekly Monday', type: 'weekly', value_1: 'Monday', value_2: '10' },
        { schedule_id: '3', name: 'Monthly 15th', type: 'monthly', value_1: '15', value_2: '14' }
    ];

    const mockClients = [
        { username: 'client001', firm_name: 'Rajesh Traders', name: 'Rajesh Kumar', mobile: '+91 9876543210', pan: 'ABCDE1234F' },
        { username: 'client002', firm_name: 'Priya Enterprises', name: 'Priya Sharma', mobile: '+91 9876543211', pan: 'BCDEF2345G' },
        { username: 'client003', firm_name: 'Amit & Co.', name: 'Amit Patel', mobile: '+91 9876543212', pan: 'CDEFG3456H' }
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

    // Last element observer for infinite scroll (Whitelist)
    const lastWhitelistElementRef = useCallback(node => {
        if (isLoadingMoreWhitelist) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreWhitelist) {
                loadMoreWhitelistData();
            }
        });

        if (node) observer.current.observe(node);
    }, [isLoadingMoreWhitelist, hasMoreWhitelist]);

    // Initial data load
    useEffect(() => {
        fetchWhitelistData(true);
        fetchScheduleData();
        setSchedules(mockSchedules);
    }, []);

    // Whitelist functions
    const fetchWhitelistData = async (reset = false) => {
        if (reset) {
            setLoading(true);
            setWhitelistPage(1);
            setWhitelist([]);
        } else {
            setIsLoadingMoreWhitelist(true);
        }

        setTimeout(() => {
            let whitelistData;
            const startIndex = (reset ? 0 : (whitelistPage - 1) * 2);
            whitelistData = mockWhitelistData.slice(startIndex, startIndex + 2);

            if (reset) {
                setWhitelist(whitelistData);
                setHasMoreWhitelist(whitelistData.length > 0);
            } else {
                setWhitelist(prev => [...prev, ...whitelistData]);
                setHasMoreWhitelist(whitelistData.length > 0);
            }

            if (reset) {
                setLoading(false);
            } else {
                setIsLoadingMoreWhitelist(false);
            }
        }, 1000);
    };

    const loadMoreWhitelistData = () => {
        if (!hasMoreWhitelist || isLoadingMoreWhitelist) return;
        setWhitelistPage(prev => prev + 1);
        fetchWhitelistData(false);
    };

    const handleWhitelistSearch = (e) => {
        e.preventDefault();
        fetchWhitelistData(true);
    };

    const handleWhitelistSubmit = (e) => {
        e.preventDefault();
        console.log('Whitelist form data:', whitelistForm);
        setShowCreateWhitelistModal(false);
        resetWhitelistForm();
        fetchWhitelistData(true);
    };

    const handleDeleteWhitelist = (id) => {
        console.log('Deleting whitelist entry:', id);
        setWhitelist(prev => prev.filter(item => item.id !== id));
    };

    // Schedule functions
    const fetchScheduleData = () => {
        setLoading(true);
        setTimeout(() => {
            setScheduleList(mockScheduleData);
            setLoading(false);
        }, 1000);
    };

    const handleScheduleSubmit = (e) => {
        e.preventDefault();
        console.log('Schedule form data:', scheduleForm);
        setShowCreateScheduleModal(false);
        resetScheduleForm();
        fetchScheduleData();
    };

    const handleEditScheduleSubmit = (e) => {
        e.preventDefault();
        console.log('Edit schedule form data:', editScheduleForm);
        setShowEditScheduleModal(false);
        fetchScheduleData();
    };

    const handleEditScheduleClick = (schedule) => {
        setSelectedSchedule(schedule);
        setEditScheduleForm({
            schedule_id: schedule.schedule_id,
            name: schedule.name,
            type: schedule.type,
            day: schedule.type === 'weekly' ? schedule.value_1 : '',
            date: schedule.type === 'monthly' ? schedule.value_1 : '',
            hour: schedule.type === 'daily' ? schedule.value_1 : schedule.value_2,
            status: schedule.status
        });
        setShowEditScheduleModal(true);
    };

    const handleDeleteSchedule = (scheduleId) => {
        console.log('Deleting schedule:', scheduleId);
        setScheduleList(prev => prev.filter(item => item.schedule_id !== scheduleId));
    };

    // Helper functions
    const handleShowScheduleValues = (type, value_1, value_2) => {
        if (type === 'daily') {
            return `Daily at ${formatHour(value_1)}`;
        } else if (type === 'weekly') {
            return `Every ${value_1} at ${formatHour(value_2)}`;
        } else if (type === 'monthly') {
            return `Every ${value_1 === 'last day' ? 'last day' : `${value_1} day`} of month at ${formatHour(value_2)}`;
        } else {
            return `Invalid Type`;
        }
    };

    const formatHour = (hour) => {
        const hourNum = parseInt(hour);
        if (hourNum === 0) return '12 AM';
        if (hourNum === 12) return '12 PM';
        if (hourNum < 12) return `${hourNum} AM`;
        return `${hourNum - 12} PM`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Form handlers
    const handleWhitelistChange = (field, value) => {
        const newForm = { ...whitelistForm, [field]: value };
        
        if (field === 'schedule_id') {
            const selectedSchedule = schedules.find(s => s.schedule_id === value);
            if (selectedSchedule) {
                newForm.show_schedule = handleShowScheduleValues(
                    selectedSchedule.type,
                    selectedSchedule.value_1,
                    selectedSchedule.value_2
                );
            } else {
                newForm.show_schedule = '';
            }
        }
        
        setWhitelistForm(newForm);
    };

    const handleScheduleChange = (field, value) => {
        setScheduleForm(prev => ({ ...prev, [field]: value }));
    };

    const handleEditScheduleChange = (field, value) => {
        setEditScheduleForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSearchWhitelistChange = (field, value) => {
        setSearchWhitelist(prev => ({ ...prev, [field]: value }));
    };

    // Reset forms
    const resetWhitelistForm = () => {
        setWhitelistForm({
            usernames: [],
            schedule_id: '',
            show_schedule: ''
        });
        setSelectedClients([]);
    };

    const resetScheduleForm = () => {
        setScheduleForm({
            name: '',
            type: '',
            day: '',
            date: '',
            hour: ''
        });
    };

    // Skeleton Loading Component
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
                    {/* Tabs Skeleton */}
                    <div className="mb-6">
                        <div className="border-b border-gray-200">
                            <div className="flex space-x-8">
                                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24 animate-pulse"></div>
                                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* Content Skeleton */}
                    <div className="bg-white rounded-xl shadow-lg animate-pulse">
                        <div className="border-b border-gray-200 px-6 py-5">
                            <div className="h-7 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48"></div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg"></div>
                                <div className="flex justify-center py-4">
                                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render functions
    const renderWhitelistTab = () => (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
            {/* Header Section - Fixed alignment */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 px-6 py-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0">
                    {/* Left side - Title and description */}
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
                            <FiUsers className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <h5 className="text-lg font-bold text-gray-900 leading-tight">Reminder Whitelist</h5>
                            <p className="text-sm text-gray-600 mt-0.5">Manage clients receiving automated reminders</p>
                        </div>
                    </div>
                    
                    {/* Right side - Search and Add button */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        <form onSubmit={handleWhitelistSearch} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                {/* Schedule Filter */}
                                <div className="relative flex-1 sm:flex-none">
                                    <select
                                        value={searchWhitelist.schedule_id}
                                        onChange={(e) => handleSearchWhitelistChange('schedule_id', e.target.value)}
                                        className="w-full sm:w-48 pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none text-sm transition-all duration-200 hover:border-indigo-300"
                                    >
                                        <option value="">All Schedules</option>
                                        {schedules.map(schedule => (
                                            <option key={schedule.schedule_id} value={schedule.schedule_id}>
                                                {schedule.name}
                                            </option>
                                        ))}
                                    </select>
                                    <FiCalendar className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                                
                                {/* Search Input */}
                                <div className="relative flex-1 sm:flex-none">
                                    <input
                                        type="text"
                                        value={searchWhitelist.query}
                                        onChange={(e) => handleSearchWhitelistChange('query', e.target.value)}
                                        className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none text-sm transition-all duration-200 hover:border-indigo-300"
                                        placeholder="Search clients..."
                                    />
                                    <FiSearch className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                                
                                {/* Search Button */}
                                <motion.button
                                    type="submit"
                                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 min-w-[100px]"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiSearch className="w-4 h-4" />
                                    <span>Search</span>
                                </motion.button>
                            </div>
                        </form>
                        
                        {/* Add Client Button */}
                        <motion.button
                            onClick={() => setShowCreateWhitelistModal(true)}
                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FiPlus className="w-4 h-4" />
                            <span>Add Client</span>
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Table Section - Fixed alignment */}
            <div className="p-6">
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="w-full text-sm">
                        {/* Table Header - Fixed alignment */}
                        <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                <th className="text-center p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider w-16">#</th>
                                <th className="text-left p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[200px]">Client Details</th>
                                <th className="text-left p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[180px]">Contact Info</th>
                                <th className="text-right p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[120px]">Balance</th>
                                <th className="text-left p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[180px]">Schedule</th>
                                <th className="text-center p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider w-24">
                                    <FiSettings className="w-4 h-4 inline mr-1.5" />
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        
                        {/* Table Body - Fixed alignment */}
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center p-8 border-b border-gray-200">
                                        <div className="flex justify-center items-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : whitelist.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center p-8 border-b border-gray-200">
                                        <div className="flex flex-col items-center justify-center py-6">
                                            <div className="p-3 bg-gray-100 rounded-full mb-3">
                                                <FiUsers className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-700 mb-1">No clients found</h3>
                                            <p className="text-gray-500 text-sm">Add clients to start sending reminders</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                whitelist.map((item, index) => {
                                    const isLastElement = index === whitelist.length - 1;

                                    return (
                                        <motion.tr
                                            key={item.id}
                                            ref={isLastElement ? lastWhitelistElementRef : null}
                                            className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 transition-all duration-200"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                        >
                                            {/* Index Column - Centered */}
                                            <td className="text-center p-4">
                                                <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-md font-semibold">
                                                    {index + 1}
                                                </span>
                                            </td>
                                            
                                            {/* Client Details Column - Left aligned */}
                                            <td className="p-4">
                                                <a
                                                    href={`/view-client-profile?username=${item.username}`}
                                                    className="group block hover:no-underline"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-shrink-0 p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                                                            <FiUsers className="w-4 h-4 text-indigo-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                                                {item.name}
                                                            </h4>
                                                            <p className="text-sm text-gray-600 mt-0.5 truncate">
                                                                C/O: {item.guardian_name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </a>
                                            </td>
                                            
                                            {/* Contact Info Column - Left aligned */}
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    <div className="text-gray-900 font-medium truncate">
                                                        {item.mobile}
                                                    </div>
                                                    <div className="text-sm text-gray-600 truncate max-w-[200px]">
                                                        {item.email}
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Balance Column - Right aligned */}
                                            <td className="p-4 text-right">
                                                <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-semibold ${item.balance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    ₹{formatCurrency(item.balance)}
                                                </span>
                                            </td>
                                            
                                            {/* Schedule Column - Left aligned */}
                                            <td className="p-4">
                                                <div className="space-y-1.5">
                                                    <span className="inline-block px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg font-medium text-sm truncate max-w-[180px]">
                                                        {item.schedule_name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-sm text-indigo-600 truncate">
                                                        <FiClock className="w-3.5 h-3.5 flex-shrink-0" />
                                                        <span className="truncate">
                                                            {handleShowScheduleValues(item.type, item.value_1, item.value_2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Actions Column - Centered */}
                                            <td className="text-center p-4">
                                                <div className="flex justify-center">
                                                    <motion.button
                                                        onClick={() => handleDeleteWhitelist(item.id)}
                                                        className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-all duration-200"
                                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Loading indicator for infinite scroll */}
                {isLoadingMoreWhitelist && (
                    <div className="flex justify-center py-4">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                            <span className="text-gray-600 text-sm font-medium">Loading more clients...</span>
                        </div>
                    </div>
                )}

                {/* No more records message */}
                {!hasMoreWhitelist && whitelist.length > 0 && (
                    <div className="flex justify-center py-4">
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg">
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                            <span className="text-yellow-700 text-sm font-medium">All clients loaded</span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );

    const renderScheduleTab = () => (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 px-6 py-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                            <FiCalendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h5 className="text-lg font-bold text-gray-900">Reminder Schedule</h5>
                            <p className="text-sm text-gray-600 mt-0.5">Configure automated reminder schedules</p>
                        </div>
                    </div>
                    <motion.button
                        onClick={() => setShowCreateScheduleModal(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiPlus className="w-4 h-4" />
                        Create Schedule
                    </motion.button>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="bg-gray-50 rounded-xl p-6 animate-pulse">
                                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-4 w-3/4"></div>
                                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-2 w-1/2"></div>
                                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-6 w-2/3"></div>
                                <div className="flex justify-between">
                                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                                </div>
                            </div>
                        ))
                    ) : scheduleList.length === 0 ? (
                        <div className="col-span-full">
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="p-3 bg-gray-100 rounded-full mb-3">
                                    <FiCalendar className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No schedules found</h3>
                                <p className="text-gray-500 text-sm mb-4">Create your first reminder schedule</p>
                                <motion.button
                                    onClick={() => setShowCreateScheduleModal(true)}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all duration-200"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Create Schedule
                                </motion.button>
                            </div>
                        </div>
                    ) : (
                        scheduleList.map((schedule, index) => (
                            <motion.div
                                key={schedule.schedule_id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className={`rounded-xl border p-6 transition-all duration-300 hover:shadow-lg ${schedule.status === '1' ? 'border-blue-200 bg-gradient-to-br from-white to-blue-50/30 hover:border-blue-300' : 'border-gray-200 bg-gradient-to-br from-white to-gray-50/30 hover:border-gray-300'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-base mb-1">{schedule.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${schedule.type === 'daily' ? 'bg-blue-100 text-blue-700' : schedule.type === 'weekly' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                {schedule.type.toUpperCase()}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${schedule.status === '1' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {schedule.status === '1' ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                                        <FiClock className="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-medium">{handleShowScheduleValues(schedule.type, schedule.value_1, schedule.value_2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            Assigned to
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                                {schedule.count}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-700">{schedule.count} clients</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4 border-t border-gray-100">
                                    <motion.button
                                        onClick={() => handleEditScheduleClick(schedule)}
                                        className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiEdit className="w-3.5 h-3.5" />
                                        Edit
                                    </motion.button>
                                    <motion.button
                                        onClick={() => handleDeleteSchedule(schedule.schedule_id)}
                                        className="px-3 py-1.5 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    );

    // Show skeleton while loading
    if (loading && whitelist.length === 0 && scheduleList.length === 0) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
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
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Auto Reminder</h1>
                        <p className="text-gray-600 text-sm">Manage automated reminders and schedules for your clients</p>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
                            <button
                                onClick={() => setActiveTab('whitelist')}
                                className={`px-5 py-2.5 rounded-md font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                                    activeTab === 'whitelist'
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <FiUsers className="w-4 h-4" />
                                Whitelist
                                {activeTab === 'whitelist' && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                                        {whitelist.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`px-5 py-2.5 rounded-md font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                                    activeTab === 'schedule'
                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <FiCalendar className="w-4 h-4" />
                                Schedule
                                {activeTab === 'schedule' && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                                        {scheduleList.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'whitelist' ? renderWhitelistTab() : renderScheduleTab()}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modals */}
            {/* Create Whitelist Modal */}
            <AnimatePresence>
                {showCreateWhitelistModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-t-2xl">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/20 rounded-md">
                                            <FiUsers className="w-5 h-5 text-white" />
                                        </div>
                                        <h5 className="text-lg font-bold text-white">Add Clients to Whitelist</h5>
                                    </div>
                                    <button
                                        onClick={() => setShowCreateWhitelistModal(false)}
                                        className="text-white/80 hover:text-white text-2xl transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleWhitelistSubmit}>
                                    <div className="space-y-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Select Clients
                                            </label>
                                            <select
                                                multiple
                                                value={whitelistForm.usernames}
                                                onChange={(e) => handleWhitelistChange('usernames', Array.from(e.target.selectedOptions, option => option.value))}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none h-48 shadow-inner transition-all duration-200 hover:border-indigo-300"
                                            >
                                                {mockClients.map(client => (
                                                    <option key={client.username} value={client.username} className="px-2 py-2 hover:bg-indigo-50">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-medium">{client.firm_name}</span>
                                                            <span className="text-sm text-gray-500">Owner: {client.name}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm text-gray-500">
                                                            <span>📱 {client.mobile}</span>
                                                            <span>📋 PAN: {client.pan}</span>
                                                        </div>
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-sm text-gray-500 mt-3 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                                Hold Ctrl/Cmd to select multiple clients
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Schedule
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={whitelistForm.schedule_id}
                                                        onChange={(e) => handleWhitelistChange('schedule_id', e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none appearance-none shadow-sm transition-all duration-200 hover:border-indigo-300"
                                                        required
                                                    >
                                                        <option value="">Select Schedule</option>
                                                        {schedules.map(schedule => (
                                                            <option key={schedule.schedule_id} value={schedule.schedule_id}>
                                                                {schedule.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-3.5 pointer-events-none">
                                                        <div className="w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md flex items-center justify-center">
                                                            <FiCalendar className="w-3 h-3 text-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Schedule Details
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={whitelistForm.show_schedule}
                                                        readOnly
                                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 outline-none font-medium text-gray-700 shadow-inner"
                                                        placeholder="Schedule details will appear here"
                                                    />
                                                    <FiClock className="absolute right-4 top-3.5 w-4 h-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowCreateWhitelistModal(false)}
                                            className="px-5 py-2.5 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow hover:shadow-md"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Add to Whitelist
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Schedule Modal */}
            <AnimatePresence>
                {showCreateScheduleModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4 rounded-t-2xl">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/20 rounded-md">
                                            <FiCalendar className="w-5 h-5 text-white" />
                                        </div>
                                        <h5 className="text-lg font-bold text-white">Create New Schedule</h5>
                                    </div>
                                    <button
                                        onClick={() => setShowCreateScheduleModal(false)}
                                        className="text-white/80 hover:text-white text-2xl transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleScheduleSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Schedule Name
                                            </label>
                                            <input
                                                type="text"
                                                value={scheduleForm.name}
                                                onChange={(e) => handleScheduleChange('name', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-all duration-200 hover:border-blue-300"
                                                placeholder="e.g., Morning Reminder"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Schedule Type
                                            </label>
                                            <select
                                                value={scheduleForm.type}
                                                onChange={(e) => handleScheduleChange('type', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-all duration-200 hover:border-blue-300"
                                                required
                                            >
                                                <option value="">Select Type</option>
                                                <option value="daily" className="py-2">Daily</option>
                                                <option value="weekly" className="py-2">Weekly</option>
                                                <option value="monthly" className="py-2">Monthly</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Day (Weekly)
                                            </label>
                                            <select
                                                value={scheduleForm.day}
                                                onChange={(e) => handleScheduleChange('day', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-all duration-200 hover:border-blue-300"
                                            >
                                                <option value="">Select Day</option>
                                                <option value="Monday">Monday</option>
                                                <option value="Tuesday">Tuesday</option>
                                                <option value="Wednesday">Wednesday</option>
                                                <option value="Thursday">Thursday</option>
                                                <option value="Friday">Friday</option>
                                                <option value="Saturday">Saturday</option>
                                                <option value="Sunday">Sunday</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Date (Monthly)
                                            </label>
                                            <select
                                                value={scheduleForm.date}
                                                onChange={(e) => handleScheduleChange('date', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-all duration-200 hover:border-blue-300"
                                            >
                                                <option value="">Select Date</option>
                                                {Array.from({ length: 28 }, (_, i) => (
                                                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                        {String(i + 1).padStart(2, '0')}th
                                                    </option>
                                                ))}
                                                <option value="last day">Last day of Month</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Time
                                            </label>
                                            <select
                                                value={scheduleForm.hour}
                                                onChange={(e) => handleScheduleChange('hour', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-all duration-200 hover:border-blue-300"
                                                required
                                            >
                                                <option value="">Select Time</option>
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={String(i).padStart(2, '0')} className="py-2">
                                                        {i === 0 ? '12:00 AM' : i === 12 ? '12:00 PM' : i < 12 ? `${i}:00 AM` : `${i - 12}:00 PM`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowCreateScheduleModal(false)}
                                            className="px-5 py-2.5 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-medium shadow hover:shadow-md"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Create Schedule
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Schedule Modal */}
            <AnimatePresence>
                {showEditScheduleModal && selectedSchedule && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-t-2xl">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/20 rounded-md">
                                            <FiCalendar className="w-5 h-5 text-white" />
                                        </div>
                                        <h5 className="text-lg font-bold text-white">Update Schedule</h5>
                                    </div>
                                    <button
                                        onClick={() => setShowEditScheduleModal(false)}
                                        className="text-white/80 hover:text-white text-2xl transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleEditScheduleSubmit}>
                                    <input type="hidden" name="schedule_id" value={editScheduleForm.schedule_id} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Schedule Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editScheduleForm.name}
                                                onChange={(e) => handleEditScheduleChange('name', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all duration-200 hover:border-indigo-300"
                                                placeholder="Enter schedule name"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Schedule Type
                                            </label>
                                            <select
                                                value={editScheduleForm.type}
                                                onChange={(e) => handleEditScheduleChange('type', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all duration-200 hover:border-indigo-300"
                                                required
                                            >
                                                <option value="">Select Type</option>
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Day (Weekly)
                                            </label>
                                            <select
                                                value={editScheduleForm.day}
                                                onChange={(e) => handleEditScheduleChange('day', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all duration-200 hover:border-indigo-300"
                                            >
                                                <option value="">Select Day</option>
                                                <option value="Monday">Monday</option>
                                                <option value="Tuesday">Tuesday</option>
                                                <option value="Wednesday">Wednesday</option>
                                                <option value="Thursday">Thursday</option>
                                                <option value="Friday">Friday</option>
                                                <option value="Saturday">Saturday</option>
                                                <option value="Sunday">Sunday</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Date (Monthly)
                                            </label>
                                            <select
                                                value={editScheduleForm.date}
                                                onChange={(e) => handleEditScheduleChange('date', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all duration-200 hover:border-indigo-300"
                                            >
                                                <option value="">Select Date</option>
                                                {Array.from({ length: 28 }, (_, i) => (
                                                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                        {String(i + 1).padStart(2, '0')}th
                                                    </option>
                                                ))}
                                                <option value="last day">Last day of Month</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Time
                                            </label>
                                            <select
                                                value={editScheduleForm.hour}
                                                onChange={(e) => handleEditScheduleChange('hour', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all duration-200 hover:border-indigo-300"
                                                required
                                            >
                                                <option value="">Select Time</option>
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={String(i).padStart(2, '0')}>
                                                        {i === 0 ? '12:00 AM' : i === 12 ? '12:00 PM' : i < 12 ? `${i}:00 AM` : `${i - 12}:00 PM`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Status
                                            </label>
                                            <select
                                                value={editScheduleForm.status}
                                                onChange={(e) => handleEditScheduleChange('status', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all duration-200 hover:border-indigo-300"
                                                required
                                            >
                                                <option value="1">Active</option>
                                                <option value="0">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowEditScheduleModal(false)}
                                            className="px-5 py-2.5 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow hover:shadow-md"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Update Schedule
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AutoReminder;