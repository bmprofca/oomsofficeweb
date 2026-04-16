import React, { useState, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    FiTrendingUp,
    FiUsers,
    FiChevronLeft,
    FiChevronRight,
    FiChevronDown,
    FiChevronUp
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const StaffReport = () => {
    const navigate = useNavigate();
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
    const [apiError, setApiError] = useState(null);
    const [globalSummary, setGlobalSummary] = useState(null);
    const [filtersApplied, setFiltersApplied] = useState(null);
    const [legend, setLegend] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showAll, setShowAll] = useState(false);

    // Transform API data to table format
    const transformApiData = (apiData) => {
        if (!apiData || !Array.isArray(apiData)) return [];
        
        return apiData.map(item => ({
            username: item.staff?.username || '',
            name: item.staff?.name || '',
            mobile: item.staff?.mobile || '',
            email: item.staff?.email || '',
            designation: item.staff?.designation || '',
            OD: item.due_date_breakdown?.overdue ?? 0,
            DT: item.due_date_breakdown?.due_today ?? 0,
            D7: item.due_date_breakdown?.due_within_7_days ?? 0,
            FT: item.due_date_breakdown?.future ?? 0,
            WIP: item.status_breakdown?.in_process ?? 0,
            PFC: item.status_breakdown?.pending_from_client ?? 0,
            PFD: item.status_breakdown?.pending_from_department ?? 0
        }));
    };

    // Fetch team report from API
    const fetchTeamReport = async (staffUsername = 'all', serviceId = 'all', search = null) => {
        setLoading(true);
        setApiError(null);
        
        try {
            const headers = await getHeaders();
            const url = `${API_BASE_URL}/report/team-report`;
            
            const params = new URLSearchParams();
            if (staffUsername && staffUsername !== 'all') params.append('staff_username', staffUsername);
            if (serviceId && serviceId !== 'all') params.append('service_id', serviceId);
            if (search) params.append('search', search);
            
            const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;
            
            const response = await fetch(finalUrl, {
                method: 'GET',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                const transformedData = transformApiData(result.data);
                setTaskData(transformedData);
                setFilteredTaskData(transformedData);
                setGlobalSummary(result.summary);
                setFiltersApplied(result.filters_applied);
                setLegend(result.legend);
                setCurrentPage(1);
                setShowAll(false);
            } else {
                throw new Error(result.message || 'Failed to fetch team report');
            }
        } catch (error) {
            console.error('Error fetching team report:', error);
            setApiError(error.message || 'An error occurred while fetching data');
            setTaskData([]);
            setFilteredTaskData([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch services list
    const fetchServices = async () => {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/services`, {
                method: 'GET',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setServices(result.data);
                }
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    useEffect(() => {
        fetchServices();
        fetchTeamReport();
    }, []);

    const handleServiceChange = (e) => {
        const serviceId = e.target.value;
        setSelectedService(serviceId);
        setCurrentPage(1);
        setShowAll(false);
        fetchTeamReport('all', serviceId || 'all', searchQuery || null);
    };

    const handleSearch = () => {
        fetchTeamReport('all', selectedService || 'all', searchQuery || null);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleReload = () => {
        fetchTeamReport('all', selectedService || 'all', searchQuery || null);
    };

    const openTaskDetails = (category, staff) => {
        if (staff[category] === 0) return;
        navigate(`/staff/team-report-details?staff_username=${staff.username}&category=${category}`);
    };

    const handleClearFilters = () => {
        setSelectedService('');
        setSearchQuery('');
        setCurrentPage(1);
        setShowAll(false);
        fetchTeamReport('all', 'all', null);
    };

    const getMetricClass = (count, type) => {
        if (count === 0) {
            return 'text-slate-300 cursor-not-allowed';
        }
        
        const baseClasses = 'font-mono font-semibold text-sm cursor-pointer transition-all hover:scale-105 inline-flex items-center justify-center';
        
        switch (type) {
            case 'OD':
                return `${baseClasses} text-red-600 hover:text-red-700`;
            case 'DT':
                return `${baseClasses} text-orange-500 hover:text-orange-600`;
            case 'D7':
                return `${baseClasses} text-blue-500 hover:text-blue-600`;
            case 'FT':
                return `${baseClasses} text-green-500 hover:text-green-600`;
            case 'WIP':
                return `${baseClasses} text-purple-500 hover:text-purple-600`;
            case 'PFC':
            case 'PFD':
                return `${baseClasses} text-amber-500 hover:text-amber-600`;
            default:
                return `${baseClasses} text-slate-500 hover:text-slate-600`;
        }
    };

    const getMetricBackground = (type) => {
        switch (type) {
            case 'OD': return 'bg-red-50';
            case 'DT': return 'bg-orange-50';
            case 'D7': return 'bg-blue-50';
            case 'FT': return 'bg-green-50';
            case 'WIP': return 'bg-purple-50';
            case 'PFC':
            case 'PFD': return 'bg-amber-50';
            default: return 'bg-slate-50';
        }
    };

    const indexOfLastItem = showAll ? filteredTaskData.length : currentPage * itemsPerPage;
    const indexOfFirstItem = showAll ? 0 : (currentPage - 1) * itemsPerPage;
    const currentItems = filteredTaskData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTaskData.length / itemsPerPage);

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

    const SkeletonRow = () => (
        <tr className="border-b border-slate-100 animate-pulse">
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                    <div>
                        <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                        <div className="h-3 bg-slate-200 rounded w-24"></div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="h-4 bg-slate-200 rounded w-28 mb-1"></div>
                <div className="h-3 bg-slate-200 rounded w-32"></div>
            </td>
            {Array.from({ length: 7 }).map((_, index) => (
                <td key={index} className="px-4 py-4">
                    <div className="h-6 bg-slate-200 rounded w-12 mx-auto"></div>
                </td>
            ))}
        </tr>
    );

    const SkeletonLoader = () => (
<<<<<<< HEAD
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
=======
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
>>>>>>> d68b8565dcbb251b76474acab80e33ddfddeaf89
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="border-b border-slate-200 px-6 py-4">
                            <div className="flex justify-between">
                                <div className="h-6 bg-slate-200 rounded w-48"></div>
                                <div className="h-10 bg-slate-200 rounded w-64"></div>
                            </div>
                        </div>
                        <div className="p-6 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-slate-100 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading && filteredTaskData.length === 0) {
        return <SkeletonLoader />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

<<<<<<< HEAD
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
=======
            <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
>>>>>>> d68b8565dcbb251b76474acab80e33ddfddeaf89
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Error Alert */}
                    {apiError && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <FiAlertTriangle className="w-5 h-5 text-red-600" />
                                <div className="flex-1">
                                    <p className="text-red-800 text-sm font-medium">Error loading data</p>
                                    <p className="text-red-600 text-xs">{apiError}</p>
                                </div>
                                <button onClick={handleReload} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">Retry</button>
                            </div>
                        </motion.div>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Staff</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{globalSummary?.total_staff ?? filteredTaskData.length}</h3>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-emerald-500 shadow-sm">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Tasks</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{globalSummary?.total_tasks ?? filteredTaskData.reduce((sum, s) => sum + s.OD + s.DT + s.D7 + s.FT + s.WIP + s.PFC + s.PFD, 0)}</h3>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Overdue</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{globalSummary?.global_due_date_breakdown?.overdue ?? filteredTaskData.reduce((sum, s) => sum + s.OD, 0)}</h3>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">In Progress</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{globalSummary?.global_status_breakdown?.in_process ?? filteredTaskData.reduce((sum, s) => sum + s.WIP, 0)}</h3>
                        </div>
                    </div>

                    {/* Main Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Header */}
                        <div className="border-b border-slate-200 px-6 py-4 bg-white">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h5 className="text-lg font-semibold text-slate-800">Team Task Summary</h5>
                                    <p className="text-slate-500 text-xs mt-0.5">Staff-wise task tracking</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={handleKeyPress} placeholder="Search staff..." className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64" />
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="relative">
                                        <select value={selectedService} onChange={handleServiceChange} className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none w-40">
                                            <option value="">All Services</option>
                                            {services.map(service => <option key={service.service_id} value={service.service_id}>{service.name}</option>)}
                                        </select>
                                        <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    </div>
                                    {(selectedService || searchQuery) && (
                                        <button onClick={handleClearFilters} className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1">
                                            <FiX className="w-3 h-3" /> Clear
                                        </button>
                                    )}
                                    <button onClick={handleReload} disabled={loading} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1">
                                        <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Staff</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">OD</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">DT</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">D7</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">FT</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">WIP</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">PFC</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">PFD</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTaskData.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan="9" className="text-center py-12">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                        <FiUsers className="w-6 h-6 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-500 text-sm">No staff records found</p>
                                                    <button onClick={handleClearFilters} className="mt-3 text-blue-600 text-sm hover:underline">Clear filters</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {loading && [...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
                                            {!loading && currentItems.map((staff, idx) => (
                                                <motion.tr key={staff.username} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                                                <span className="text-white font-semibold text-sm">{staff.name?.charAt(0).toUpperCase() || 'S'}</span>
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-800 text-sm">{staff.name}</div>
                                                                {staff.designation && <div className="text-slate-400 text-xs">{staff.designation}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-slate-600 text-xs space-y-0.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <FiPhone className="w-3 h-3 text-slate-400" />
                                                                <span>{staff.mobile}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <FiMail className="w-3 h-3 text-slate-400" />
                                                                <span className="truncate max-w-[160px]">{staff.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {['OD', 'DT', 'D7', 'FT', 'WIP', 'PFC', 'PFD'].map((type) => (
                                                        <td key={type} className="px-3 py-3 text-center">
                                                            <div className={`inline-flex items-center justify-center min-w-[48px] px-2 py-1.5 rounded-md ${getMetricBackground(type)} transition-all ${staff[type] > 0 ? 'cursor-pointer hover:shadow-sm' : ''}`} onClick={() => openTaskDetails(type, staff)}>
                                                                <span className={getMetricClass(staff[type], type)}>{staff[type]}</span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                </motion.tr>
                                            ))}
                                        </>
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {filteredTaskData.length > itemsPerPage && !showAll && !loading && (
                                <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/50">
                                    <div className="flex justify-between items-center">
                                        <div className="text-xs text-slate-500">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTaskData.length)} of {filteredTaskData.length}</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 transition">Prev</button>
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let page = currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                                                return (
                                                    <button key={page} onClick={() => setCurrentPage(page)} className={`px-2.5 py-1 text-xs rounded transition ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-white'}`}>{page}</button>
                                                );
                                            })}
                                            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-50 transition">Next</button>
                                            <button onClick={() => setShowAll(true)} className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-white transition ml-2">Show All</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {showAll && filteredTaskData.length > itemsPerPage && (
                                <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/50 text-center">
                                    <button onClick={() => { setShowAll(false); setCurrentPage(1); }} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-white transition flex items-center gap-1 mx-auto">Show Less <FiChevronUp className="w-3 h-3" /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffReport;