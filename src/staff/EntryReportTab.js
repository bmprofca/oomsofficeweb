import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";

const EntryReportTab = ({ entryReport, setEntryReport, variants }) => {
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loginTimes, setLoginTimes] = useState([]);
    const [punctualitySummary, setPunctualitySummary] = useState(null);
    const [officeTiming, setOfficeTiming] = useState(null);
    const [staffInfo, setStaffInfo] = useState(null);
    const [breaksData, setBreaksData] = useState({});
    const [expandedRows, setExpandedRows] = useState({});
    const [loadingBreaks, setLoadingBreaks] = useState({});
    
    // Get current month date range (1st to current date)
    const getCurrentMonthRange = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date();
        
        return {
            fromDate: firstDay.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };
    
    const [dateFilter, setDateFilter] = useState(getCurrentMonthRange());

    // Get username from URL
    const getUsernameFromUrl = () => {
        const params = new URLSearchParams(location.search);
        return params.get('username');
    };

    // Fetch login times when component mounts or filters change
    useEffect(() => {
        fetchLoginTimes();
    }, [dateFilter.fromDate, dateFilter.toDate, location.search]);

    const fetchLoginTimes = async () => {
        const username = getUsernameFromUrl();
        if (!username) return;

        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(
                `${API_BASE_URL}/attendance/showLoginTimes?username=${username}&from_date=${dateFilter.fromDate}&to_date=${dateFilter.toDate}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch login times');
            }
            
            const data = await response.json();
            if (data.success) {
                const loginTimesData = data.data.login_times || [];
                setLoginTimes(loginTimesData);
                setPunctualitySummary(data.data.punctuality_summary || null);
                setOfficeTiming(data.data.office_timing || null);
                setStaffInfo(data.data.staff || null);
                
                // Reset breaks data when new login times are fetched
                setBreaksData({});
                setExpandedRows({});
                
                // Automatically fetch breaks for all attendance records
                await fetchAllBreaks(loginTimesData);
            }
        } catch (err) {
            setError(err.message);
            console.error('Error fetching login times:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch breaks for all attendance records
    const fetchAllBreaks = async (loginTimesData) => {
        const attendanceIds = loginTimesData
            .map(item => item.attendance_id)
            .filter(id => id); // Filter out any null/undefined attendance_ids
        
        if (attendanceIds.length === 0) return;
        
        // Set loading state for all breaks
        const loadingState = {};
        attendanceIds.forEach((_, index) => {
            loadingState[index] = true;
        });
        setLoadingBreaks(loadingState);
        
        // Fetch breaks for all attendance IDs in parallel
        const fetchPromises = attendanceIds.map(async (attendanceId, index) => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/attendance/breaks?attendance_id=${attendanceId}`,
                    {
                        method: 'GET',
                        headers: getHeaders()
                    }
                );
                
                if (!response.ok) {
                    throw new Error('Failed to fetch breaks');
                }
                
                const data = await response.json();
                if (data.success) {
                    return { attendanceId, breaksData: data.data };
                } else {
                    return { attendanceId, breaksData: null, error: 'No data' };
                }
            } catch (err) {
                console.error(`Error fetching breaks for ${attendanceId}:`, err);
                return { attendanceId, breaksData: null, error: err.message };
            }
        });
        
        const results = await Promise.all(fetchPromises);
        
        // Update breaks data
        const newBreaksData = {};
        results.forEach(result => {
            if (result.breaksData) {
                newBreaksData[result.attendanceId] = result.breaksData;
            } else if (result.error) {
                newBreaksData[result.attendanceId] = { error: result.error };
            }
        });
        setBreaksData(newBreaksData);
        
        // Clear loading state
        const clearLoadingState = {};
        attendanceIds.forEach((_, index) => {
            clearLoadingState[index] = false;
        });
        setLoadingBreaks(clearLoadingState);
    };

    // Fetch breaks for a single attendance (used for retry or manual fetch if needed)
    const fetchSingleBreak = async (attendanceId, index) => {
        if (!attendanceId) return;
        
        // Don't fetch if already have data
        if (breaksData[attendanceId]) return;
        
        try {
            setLoadingBreaks(prev => ({ ...prev, [index]: true }));
            
            const response = await fetch(
                `${API_BASE_URL}/attendance/breaks?attendance_id=${attendanceId}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch breaks');
            }
            
            const data = await response.json();
            if (data.success) {
                setBreaksData(prev => ({
                    ...prev,
                    [attendanceId]: data.data
                }));
            }
        } catch (err) {
            console.error('Error fetching breaks:', err);
            setBreaksData(prev => ({
                ...prev,
                [attendanceId]: { error: err.message }
            }));
        } finally {
            setLoadingBreaks(prev => ({ ...prev, [index]: false }));
        }
    };

    const toggleRowExpansion = (attendanceId, index) => {
        setExpandedRows(prev => ({
            ...prev,
            [attendanceId]: !prev[attendanceId]
        }));
    };

    const handleDateFilterChange = (type, value) => {
        setDateFilter(prev => ({
            ...prev,
            [type]: value
        }));
    };

    const handleApplyFilter = () => {
        fetchLoginTimes();
    };

    const handleResetToCurrentMonth = () => {
        setDateFilter(getCurrentMonthRange());
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (error) {
            return '—';
        }
    };

    // Format time
    const formatTime = (timeStr) => {
        if (!timeStr) return '—';
        if (typeof timeStr === 'string' && timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
            const [hours, minutes] = timeStr.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        }
        return '—';
    };

    // Format datetime
    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return '—';
        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return '—';
        }
    };

    // Format late duration
    const formatLateDuration = (timeDifferenceMinutes) => {
        if (!timeDifferenceMinutes || timeDifferenceMinutes <= 0) return '—';
        const hours = Math.floor(timeDifferenceMinutes / 60);
        const minutes = timeDifferenceMinutes % 60;
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h`;
        return `${minutes}m`;
    };

    // Get punctuality label and style
    const getPunctualityInfo = (punctuality) => {
        if (!punctuality) return { label: '—', color: 'text-gray-500', bgColor: 'bg-gray-100', lateDuration: null };
        
        const status = punctuality.status;
        const timeDiff = punctuality.time_difference_minutes;
        
        switch(status) {
            case 'pre_entry':
                return { 
                    label: 'Pre Entry', 
                    color: 'text-green-700', 
                    bgColor: 'bg-green-100',
                    lateDuration: null
                };
            case 'on_time':
                return { 
                    label: 'On Time', 
                    color: 'text-blue-700', 
                    bgColor: 'bg-blue-100',
                    lateDuration: null
                };
            case 'late_entry':
                return { 
                    label: 'Late Entry', 
                    color: 'text-orange-700', 
                    bgColor: 'bg-orange-100',
                    lateDuration: formatLateDuration(timeDiff)
                };
            default:
                return { 
                    label: 'No Punch', 
                    color: 'text-red-700', 
                    bgColor: 'bg-red-100',
                    lateDuration: null
                };
        }
    };

    const username = getUsernameFromUrl();

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-4"
        >
            {/* Header with Staff Info and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Entry Report</h3>
                        {staffInfo && (
                            <p className="text-sm text-gray-500 mt-0.5">
                                {staffInfo.name} {staffInfo.designation && `• ${staffInfo.designation}`}
                            </p>
                        )}
                    </div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                value={dateFilter.fromDate}
                                onChange={(e) => handleDateFilterChange('fromDate', e.target.value)}
                                className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                size="12"
                            />
                            <span className="text-gray-400">—</span>
                            <input
                                type="date"
                                value={dateFilter.toDate}
                                onChange={(e) => handleDateFilterChange('toDate', e.target.value)}
                                className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                size="12"
                            />
                        </div>
                        <button
                            onClick={handleApplyFilter}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                        >
                            Apply
                        </button>
                        <button
                            onClick={handleResetToCurrentMonth}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                        >
                            Current Month
                        </button>
                    </div>
                </div>

                {/* Office Timing Info */}
                {officeTiming && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                        <span>Office: {officeTiming.start_time} - {officeTiming.end_time}</span>
                        <span>Grace: {officeTiming.grace_period_minutes} min</span>
                        <span>On-time window: {officeTiming.on_time_window}</span>
                    </div>
                )}
            </div>

            {/* Punctuality Summary Cards */}
            {punctualitySummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <p className="text-xs text-green-600 font-medium">Pre Entry</p>
                        <p className="text-2xl font-bold text-green-700">{punctualitySummary.breakdown?.pre_entry?.count || 0}</p>
                        <p className="text-xs text-green-500">{punctualitySummary.breakdown?.pre_entry?.percentage || 0}%</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs text-blue-600 font-medium">On Time</p>
                        <p className="text-2xl font-bold text-blue-700">{punctualitySummary.breakdown?.on_time?.count || 0}</p>
                        <p className="text-xs text-blue-500">{punctualitySummary.breakdown?.on_time?.percentage || 0}%</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                        <p className="text-xs text-orange-600 font-medium">Late Entry</p>
                        <p className="text-2xl font-bold text-orange-700">{punctualitySummary.breakdown?.late_entry?.count || 0}</p>
                        <p className="text-xs text-orange-500">{punctualitySummary.breakdown?.late_entry?.percentage || 0}%</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                        <p className="text-xs text-indigo-600 font-medium">Punctuality Score</p>
                        <p className="text-2xl font-bold text-indigo-700">{punctualitySummary.punctuality_score?.score || 0}%</p>
                        <p className="text-xs text-indigo-500">{punctualitySummary.punctuality_score?.grade}</p>
                    </div>
                </div>
            )}

            {/* Table with expandable rows for breaks */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-600">{error}</div>
                    ) : loginTimes.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punctuality</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Duration</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breaks</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loginTimes.map((item, index) => {
                                    const punctualityInfo = getPunctualityInfo(item.punctuality);
                                    const attendanceId = item.attendance_id;
                                    const isExpanded = expandedRows[attendanceId];
                                    const breaksInfo = breaksData[attendanceId];
                                    const isLoadingBreaks = loadingBreaks[index];
                                    
                                    return (
                                        <React.Fragment key={index}>
                                            <motion.tr 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: index * 0.03 }}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {attendanceId && breaksInfo && breaksInfo.summary && breaksInfo.summary.total_breaks > 0 && (
                                                        <button
                                                            onClick={() => toggleRowExpansion(attendanceId, index)}
                                                            className="text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                                        >
                                                            <svg
                                                                className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {attendanceId && (!breaksInfo || !breaksInfo.summary || breaksInfo.summary.total_breaks === 0) && (
                                                        <div className="w-5"></div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {formatDate(item.date)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {item.office_time || officeTiming?.start_time || '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-sm text-gray-700 font-medium">
                                                        {formatTime(item.entry_time)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${punctualityInfo.bgColor} ${punctualityInfo.color}`}>
                                                        {punctualityInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {punctualityInfo.lateDuration ? (
                                                        <span className="text-sm font-semibold text-orange-600">
                                                            +{punctualityInfo.lateDuration}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {isLoadingBreaks ? (
                                                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                                    ) : breaksInfo?.summary ? (
                                                        <span className={`text-sm font-medium ${breaksInfo.summary.total_breaks > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                            {breaksInfo.summary.total_breaks} break{breaksInfo.summary.total_breaks !== 1 ? 's' : ''}
                                                            {breaksInfo.summary.total_break_minutes > 0 && (
                                                                <span className="text-xs text-gray-500 ml-1">
                                                                    ({breaksInfo.summary.total_break_minutes}m)
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : breaksInfo?.error ? (
                                                        <span className="text-xs text-red-500">Error</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                            </motion.tr>
                                            
                                            {/* Expandable breaks row */}
                                            <AnimatePresence>
                                                {isExpanded && attendanceId && breaksInfo?.summary && breaksInfo.summary.total_breaks > 0 && (
                                                    <motion.tr
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="bg-gray-50"
                                                    >
                                                        <td colSpan="8" className="px-4 py-3">
                                                            <div className="pl-6">
                                                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                                    Break Details
                                                                </h4>
                                                                
                                                                {breaksInfo?.summary && (
                                                                    <div className="space-y-3">
                                                                        {/* Summary badges */}
                                                                        <div className="flex flex-wrap gap-3">
                                                                            <div className="bg-white rounded-md px-3 py-1.5 border border-gray-200">
                                                                                <span className="text-xs text-gray-500">Total Breaks</span>
                                                                                <p className="text-sm font-semibold text-gray-800">{breaksInfo.summary.total_breaks}</p>
                                                                            </div>
                                                                            <div className="bg-white rounded-md px-3 py-1.5 border border-gray-200">
                                                                                <span className="text-xs text-gray-500">Total Minutes</span>
                                                                                <p className="text-sm font-semibold text-gray-800">{breaksInfo.summary.total_break_minutes}m</p>
                                                                            </div>
                                                                            <div className="bg-white rounded-md px-3 py-1.5 border border-gray-200">
                                                                                <span className="text-xs text-gray-500">Excess Minutes</span>
                                                                                <p className={`text-sm font-semibold ${breaksInfo.summary.total_excess_minutes > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                                                                                    {breaksInfo.summary.total_excess_minutes}m
                                                                                </p>
                                                                            </div>
                                                                            <div className="bg-white rounded-md px-3 py-1.5 border border-gray-200">
                                                                                <span className="text-xs text-gray-500">Penalty</span>
                                                                                <p className="text-sm font-semibold text-gray-800">₹{breaksInfo.summary.total_penalty || 0}</p>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Breaks table */}
                                                                        {breaksInfo.breaks && breaksInfo.breaks.length > 0 && (
                                                                            <div className="overflow-x-auto">
                                                                                <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                                                                                    <thead className="bg-gray-100">
                                                                                        <tr>
                                                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                                                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Start Time</th>
                                                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">End Time</th>
                                                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                                                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Allowed</th>
                                                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Excess</th>
                                                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-gray-200 bg-white">
                                                                                        {breaksInfo.breaks.map((breakItem, breakIndex) => (
                                                                                            <tr key={breakItem.id} className="hover:bg-gray-50">
                                                                                                <td className="px-3 py-2 text-gray-500">{breakIndex + 1}</td>
                                                                                                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                                                                                    {formatDateTime(breakItem.break_start_time)}
                                                                                                </td>
                                                                                                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                                                                                    {breakItem.break_end_time ? formatDateTime(breakItem.break_end_time) : 'Ongoing'}
                                                                                                </td>
                                                                                                <td className="px-3 py-2 font-medium text-gray-800">
                                                                                                    {breakItem.break_duration_minutes}m
                                                                                                </td>
                                                                                                <td className="px-3 py-2 text-gray-500">
                                                                                                    {breakItem.allowed_break_minutes}m
                                                                                                </td>
                                                                                                <td className="px-3 py-2">
                                                                                                    {breakItem.excess_break_minutes > 0 ? (
                                                                                                        <span className="text-orange-600 font-medium">
                                                                                                            +{breakItem.excess_break_minutes}m
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="text-gray-400">—</span>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="px-3 py-2">
                                                                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                                                                        breakItem.break_status === 'completed' 
                                                                                                            ? 'bg-green-100 text-green-700'
                                                                                                            : breakItem.break_status === 'ongoing'
                                                                                                            ? 'bg-yellow-100 text-yellow-700'
                                                                                                            : 'bg-gray-100 text-gray-700'
                                                                                                    }`}>
                                                                                                        {breakItem.break_status === 'completed' ? 'Completed' : 
                                                                                                         breakItem.break_status === 'ongoing' ? 'Ongoing' : breakItem.break_status}
                                                                                                    </span>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No login records found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {username ? `No entries for ${dateFilter.fromDate} to ${dateFilter.toDate}` : 'Please select a staff member'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {loginTimes.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                        Showing {loginTimes.length} record{loginTimes.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default EntryReportTab;