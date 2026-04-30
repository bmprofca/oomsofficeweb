import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";

const AttendanceTab = ({ attendance, setAttendance, variants }) => {
    const location = useLocation();
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [loading, setLoading] = useState(false);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [punchLoading, setPunchLoading] = useState(false);
    const [breakLoading, setBreakLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [error, setError] = useState(null);
    const [monthlySummary, setMonthlySummary] = useState(null);
    const [calendarData, setCalendarData] = useState(null);
    const [staffInfo, setStaffInfo] = useState(null);
    const [period, setPeriod] = useState(null);
    const [selectedDayDetails, setSelectedDayDetails] = useState(null);
    const [breakStatus, setBreakStatus] = useState(null);
    const [showBreakDropdown, setShowBreakDropdown] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyFormData, setVerifyFormData] = useState({
        verify_status: 'present',
        consider_break: true,
        admin_remarks: '',
        manual_punch_in: '',
        manual_punch_out: '',
        apply_travel_allowance: true,
        apply_other_deductions: true
    });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

    // Get username from URL
    const getUsernameFromUrl = () => {
        const params = new URLSearchParams(location.search);
        return params.get('username');
    };

    // Format duration from minutes to readable format
    const formatDuration = (minutes) => {
        if (!minutes || minutes === 0) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    // Fetch monthly summary when month/year changes
    useEffect(() => {
        fetchMonthlySummary();
    }, [selectedMonth, selectedYear, location.search]);

    // Fetch calendar data when month/year changes
    useEffect(() => {
        fetchCalendarData();
    }, [selectedMonth, selectedYear, location.search]);

    // Check break status on component mount
    useEffect(() => {
        checkBreakStatus();
    }, [location.search]);

    const fetchMonthlySummary = async () => {
        const username = getUsernameFromUrl();
        if (!username) return;

        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(
                `${API_BASE_URL}/attendance/staff-monthly-summary/${username}?month=${selectedMonth}&year=${selectedYear}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch monthly summary');
            }
            
            const data = await response.json();
            if (data.success) {
                setMonthlySummary(data.data.summary);
                setStaffInfo(data.data.staff_info);
                setPeriod(data.data.period);
            }
        } catch (err) {
            setError(err.message);
            console.error('Error fetching monthly summary:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCalendarData = async () => {
        const username = getUsernameFromUrl();
        if (!username) return;

        try {
            setCalendarLoading(true);
            
            const response = await fetch(
                `${API_BASE_URL}/attendance/attendance-calendar/${username}?month=${selectedMonth}&year=${selectedYear}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch calendar data');
            }
            
            const data = await response.json();
            if (data.success) {
                setCalendarData(data.data);
            }
        } catch (err) {
            console.error('Error fetching calendar data:', err);
        } finally {
            setCalendarLoading(false);
        }
    };

    const checkBreakStatus = async () => {
        const username = getUsernameFromUrl();
        if (!username) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/break/status/${username}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setBreakStatus(data.data);
                }
            }
        } catch (err) {
            console.error('Error checking break status:', err);
        }
    };

    const handleBreakStart = async () => {
        const username = getUsernameFromUrl();
        if (!username) {
            alert('No username found in URL');
            return;
        }

        setBreakLoading(true);
        setError(null);
        setShowBreakDropdown(false);

        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/break/start`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ username: username })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to start break');
            }

            const data = await response.json();
            if (data.success) {
                alert('Break started successfully!');
                await checkBreakStatus();
                fetchMonthlySummary();
                fetchCalendarData();
                
            } else {
                alert(data.message || 'Failed to start break');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error starting break:', err);
            alert('Failed to start break: ' + err.message);
        } finally {
            setBreakLoading(false);
        }
    };

    const handleBreakEnd = async () => {
        const username = getUsernameFromUrl();
        if (!username) {
            alert('No username found in URL');
            return;
        }

        setBreakLoading(true);
        setError(null);
        setShowBreakDropdown(false);

        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/break/end`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ username: username })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to end break');
            }

            const data = await response.json();
            if (data.success) {
                alert(`Break ended! Duration: ${data.data.current_break.break_duration_minutes} minutes`);
                await checkBreakStatus();
                fetchMonthlySummary();
                fetchCalendarData();
            } else {
                alert(data.message || 'Failed to end break');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error ending break:', err);
            alert('Failed to end break: ' + err.message);
        } finally {
            setBreakLoading(false);
        }
    };

    const handlePunchIn = async () => {
        const username = getUsernameFromUrl();
        if (!username) {
            alert('No username found in URL');
            return;
        }

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setPunchLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const response = await fetch(
                        `${API_BASE_URL}/attendance/punch-in`,
                        {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({
                                username: username,
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Failed to punch in');
                    }

                    const data = await response.json();
                    if (data.success) {
                        alert('Punch In successful!');
                        fetchMonthlySummary();
                        fetchCalendarData();
                    }
                } catch (err) {
                    setError(err.message);
                    console.error('Error punching in:', err);
                    alert('Failed to punch in: ' + err.message);
                } finally {
                    setPunchLoading(false);
                }
            },
            (error) => {
                setError('Failed to get location: ' + error.message);
                setPunchLoading(false);
                alert('Failed to get location: ' + error.message);
            }
        );
    };

    const handlePunchOut = async () => {
        const username = getUsernameFromUrl();
        if (!username) {
            alert('No username found in URL');
            return;
        }

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setPunchLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const response = await fetch(
                        `${API_BASE_URL}/attendance/punch-out`,
                        {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({
                                username: username,
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Failed to punch out');
                    }

                    const data = await response.json();
                    if (data.success) {
                        alert('Punch Out successful!');
                        fetchMonthlySummary();
                        fetchCalendarData();
                    }
                } catch (err) {
                    setError(err.message);
                    console.error('Error punching out:', err);
                    alert('Failed to punch out: ' + err.message);
                } finally {
                    setPunchLoading(false);
                }
            },
            (error) => {
                setError('Failed to get location: ' + error.message);
                setPunchLoading(false);
                alert('Failed to get location: ' + error.message);
            }
        );
    };

    // Handle admin verification - MODIFIED to handle missing attendance records
    const handleVerifyAttendance = async () => {
        const username = getUsernameFromUrl();
        if (!username) {
            alert('No username found in URL');
            return;
        }

        if (!selectedDayDetails) {
            alert('No day selected for verification.');
            return;
        }

        setVerifyLoading(true);

        // Prepare payload based on the API specifications
        const payload = {
            username: username,
            attendance_date: selectedDayDetails.date,
            verify_status: verifyFormData.verify_status,
            consider_break: verifyFormData.consider_break,
            admin_remarks: verifyFormData.admin_remarks,
            apply_travel_allowance: verifyFormData.apply_travel_allowance,
            apply_other_deductions: verifyFormData.apply_other_deductions,
            create_if_missing: true // Always create if missing
        };

        // Add attendance_id only if it exists
        if (selectedDayDetails.attendance_id) {
            payload.attendance_id = selectedDayDetails.attendance_id;
        }

        // Add manual times if provided
        if (verifyFormData.manual_punch_in) {
            // Extract time from datetime-local value or use as is
            let punchInTime = verifyFormData.manual_punch_in;
            if (punchInTime.includes('T')) {
                punchInTime = punchInTime.split('T')[1];
            }
            payload.manual_punch_in = punchInTime;
        }
        
        if (verifyFormData.manual_punch_out) {
            let punchOutTime = verifyFormData.manual_punch_out;
            if (punchOutTime.includes('T')) {
                punchOutTime = punchOutTime.split('T')[1];
            }
            payload.manual_punch_out = punchOutTime;
        }

        console.log('Verification Payload:', payload);

        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/verify-v2`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to verify attendance');
            }

            const data = await response.json();
            if (data.success) {
                alert(data.message || 'Attendance verified successfully!');
                setShowVerifyModal(false);
                setSelectedDayDetails(null);
                // Refresh data
                await fetchCalendarData();
                await fetchMonthlySummary();
                // Reset form
                setVerifyFormData({
                    verify_status: 'present',
                    consider_break: true,
                    admin_remarks: '',
                    manual_punch_in: '',
                    manual_punch_out: '',
                    apply_travel_allowance: true,
                    apply_other_deductions: true
                });
            } else {
                alert(data.message || 'Failed to verify attendance');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error verifying attendance:', err);
            alert('Failed to verify attendance: ' + err.message);
        } finally {
            setVerifyLoading(false);
        }
    };

    // Handle month navigation
    const handlePreviousMonth = () => {
        if (selectedMonth === 1) {
            setSelectedYear(prev => prev - 1);
            setSelectedMonth(12);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedYear(prev => prev + 1);
            setSelectedMonth(1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const handleMonthSelect = (month) => {
        setSelectedMonth(parseInt(month));
    };

    const handleYearSelect = (year) => {
        setSelectedYear(parseInt(year));
    };

    // MODIFIED: Handle day click to properly handle missing attendance
    const handleDayClick = (dayData) => {
        // If no attendance_id exists and it's a future or pending day, create a placeholder
        if (!dayData.attendance_id && (dayData.status === 'future' || dayData.status === 'pending')) {
            setSelectedDayDetails({
                ...dayData,
                attendance_id: null,
                details: null,
                has_attendance: false,
                status_display: 'No Record',
                icon: '📅',
                is_verified: false
            });
        } else {
            setSelectedDayDetails(dayData);
        }
    };

    // MODIFIED: Open verify modal to handle missing attendance
    const openVerifyModal = () => {
        if (!selectedDayDetails) {
            alert('No day selected for verification.');
            return;
        }
        
        // Pre-populate form with existing details if available
        let status = 'present';
        let manualPunchIn = '';
        let manualPunchOut = '';
        
        if (selectedDayDetails.details) {
            status = selectedDayDetails.status || 'present';
            
            // Set manual times from existing details if available
            if (selectedDayDetails.details.punch_in) {
                manualPunchIn = `${selectedDayDetails.date}T${selectedDayDetails.details.punch_in}`;
            }
            if (selectedDayDetails.details.punch_out) {
                manualPunchOut = `${selectedDayDetails.date}T${selectedDayDetails.details.punch_out}`;
            }
        } else if (!selectedDayDetails.attendance_id) {
            // For new records without attendance, suggest default times
            const defaultPunchIn = '09:00:00';
            const defaultPunchOut = '18:00:00';
            manualPunchIn = `${selectedDayDetails.date}T${defaultPunchIn}`;
            manualPunchOut = `${selectedDayDetails.date}T${defaultPunchOut}`;
            status = 'present';
        }
        
        setVerifyFormData({
            verify_status: status,
            consider_break: true,
            admin_remarks: selectedDayDetails.details?.admin_remarks || '',
            manual_punch_in: manualPunchIn,
            manual_punch_out: manualPunchOut,
            apply_travel_allowance: true,
            apply_other_deductions: true
        });
        setShowVerifyModal(true);
    };

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Kolkata'
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
            return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
        }
        return '—';
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(parseFloat(amount));
    };

    // Get professional status color for calendar
    const getStatusColor = (status, isToday = false) => {
        const baseColors = {
            'present': 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
            'absent': 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200',
            'half_day': 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
            'paid_leave': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
            'fine': 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
            'bonus': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
            'pending': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
            'weekly_off': 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
            'future': 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
        };
        
        if (isToday) {
            return 'bg-indigo-100 text-indigo-700 border-indigo-300 ring-2 ring-indigo-200';
        }
        
        return baseColors[status?.toLowerCase()] || 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100';
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const badges = {
            'present': { label: 'Present', color: 'bg-emerald-100 text-emerald-800' },
            'absent': { label: 'Absent', color: 'bg-rose-100 text-rose-800' },
            'half_day': { label: 'Half Day', color: 'bg-amber-100 text-amber-800' },
            'paid_leave': { label: 'Paid Leave', color: 'bg-blue-100 text-blue-800' },
            'fine': { label: 'Fine', color: 'bg-orange-100 text-orange-800' },
            'bonus': { label: 'Bonus', color: 'bg-purple-100 text-purple-800' },
            'pending': { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
            'weekly_off': { label: 'Weekly Off', color: 'bg-yellow-100 text-yellow-800' },
            'future': { label: 'Future', color: 'bg-gray-100 text-gray-500' }
        };
        return badges[status?.toLowerCase()] || { label: status || '—', color: 'bg-gray-100 text-gray-700' };
    };

    // SVG Icons
    const CalendarIcon = ({ className = "w-5 h-5" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );

    const ChevronLeftIcon = ({ className = "w-5 h-5" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
    );

    const ChevronRightIcon = ({ className = "w-5 h-5" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
    );

    const ChevronDownIcon = ({ className = "w-4 h-4" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
    );

    const LoginIcon = ({ className = "w-4 h-4" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
    );

    const LogoutIcon = ({ className = "w-4 h-4" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    );

    const BreakIcon = ({ className = "w-4 h-4" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const CoffeeIcon = ({ className = "w-4 h-4" }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3h14M7 3v5a5 5 0 0010 0V3M6 21h12M8 21v-4a4 4 0 018 0v4" />
        </svg>
    );

    const username = getUsernameFromUrl();

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-screen bg-gray-50 p-6"
        >
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Attendance Overview</h1>
                            {staffInfo && (
                                <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
                                    <span className="font-medium text-gray-900">{staffInfo.name}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{staffInfo.designation}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{staffInfo.email}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {/* Break Status Indicator */}
                            {breakStatus?.has_ongoing_break && (
                                <div className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full flex items-center gap-2">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                    Break in progress ({formatDuration(breakStatus.break_duration_minutes || 0)})
                                </div>
                            )}
                            
                            {/* Break Dropdown Button */}
                            <div className="relative">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowBreakDropdown(!showBreakDropdown)}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <CoffeeIcon className="w-4 h-4" />
                                    Break Options
                                    <ChevronDownIcon className="w-4 h-4" />
                                </motion.button>
                                
                                {/* Dropdown Menu */}
                                {showBreakDropdown && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                        <button
                                            onClick={handleBreakStart}
                                            disabled={breakLoading}
                                            className="w-full px-4 py-2 text-left text-sm rounded-t-lg flex items-center gap-2 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                                        >
                                            <BreakIcon className="w-4 h-4" />
                                            {breakLoading ? 'Processing...' : 'Start Break'}
                                        </button>
                                        <button
                                            onClick={handleBreakEnd}
                                            disabled={breakLoading}
                                            className="w-full px-4 py-2 text-left text-sm rounded-b-lg flex items-center gap-2 border-t border-gray-100 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                                        >
                                            <LogoutIcon className="w-4 h-4" />
                                            {breakLoading ? 'Processing...' : 'End Break'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Punch In Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handlePunchIn}
                                disabled={punchLoading || !username}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                <LoginIcon className="w-4 h-4" />
                                {punchLoading ? 'Processing...' : 'Punch In'}
                            </motion.button>
                            
                            {/* Punch Out Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handlePunchOut}
                                disabled={punchLoading || !username}
                                className="px-4 py-2 bg-white text-rose-600 text-sm font-medium rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <LogoutIcon className="w-4 h-4" />
                                {punchLoading ? 'Processing...' : 'Punch Out'}
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Dropdown */}
                        <div className="relative">
                            <select 
                                value={selectedMonth}
                                onChange={(e) => handleMonthSelect(e.target.value)}
                                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer min-w-[140px]"
                            >
                                {months.map((month, index) => (
                                    <option key={month} value={index + 1}>{month}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            </div>
                        </div>

                        {/* Year Dropdown */}
                        <div className="relative">
                            <select 
                                value={selectedYear}
                                onChange={(e) => handleYearSelect(parseInt(e.target.value))}
                                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer min-w-[100px]"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            <button 
                                onClick={handlePreviousMonth}
                                className="p-2 hover:bg-white rounded-lg transition-colors"
                                title="Previous Month"
                            >
                                <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="px-4 py-1 text-sm font-medium text-indigo-600 min-w-[140px] text-center">
                                {months[selectedMonth - 1]} {selectedYear}
                            </span>
                            <button 
                                onClick={handleNextMonth}
                                className="p-2 hover:bg-white rounded-lg transition-colors"
                                title="Next Month"
                            >
                                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>

                        {/* Period Info */}
                        {period && (
                            <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                                <CalendarIcon className="w-4 h-4 inline mr-1" />
                                {formatDate(period.start_date)} - {formatDate(period.end_date)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Month Summary Badge */}
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full">
                        {months[selectedMonth - 1]} {selectedYear} Summary
                    </span>
                    {monthlySummary && (
                        <span className="text-sm text-gray-500">
                            Attendance: {monthlySummary.attendance_percentage || '0%'}
                        </span>
                    )}
                </div>

                {/* Summary Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 text-red-600">{error}</div>
                        ) : monthlySummary ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Not Marked</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Half Day</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Over Time</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fine Hours</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Leave</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-2xl font-bold text-gray-900">{monthlySummary.total_days || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-2xl font-bold text-emerald-600">{monthlySummary.present || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-2xl font-bold text-rose-600">{monthlySummary.absent || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-2xl font-bold text-amber-600">{monthlySummary.not_marked || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-2xl font-bold text-amber-600">{monthlySummary.half_day || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <span className="text-lg font-bold text-blue-600">
                                                    {monthlySummary.over_time?.formatted || '0h 0m'}
                                                </span>
                                                {monthlySummary.over_time?.hours > 0 && (
                                                    <span className="block text-xs text-gray-500">
                                                        {monthlySummary.over_time.hours}h {monthlySummary.over_time.minutes_remainder || 0}m
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <span className="text-lg font-bold text-orange-600">
                                                    {monthlySummary.fine_hours?.formatted || '0h 0m'}
                                                </span>
                                                {monthlySummary.fine_hours?.hours > 0 && (
                                                    <span className="block text-xs text-gray-500">
                                                        {monthlySummary.fine_hours.hours}h {monthlySummary.fine_hours.minutes_remainder || 0}m
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-2xl font-bold text-purple-600">{monthlySummary.paid_leave || 0}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                No summary data available for the selected month
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Calendar Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {months[selectedMonth - 1]} {selectedYear} Attendance Calendar
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Click on a day to view details and verify attendance
                                    </p>
                                </div>
                            </div>
                            
                            {calendarLoading && (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                                    <span className="text-sm text-gray-500">Loading...</span>
                                </div>
                            )}

                            {/* Legend */}
                            {calendarData?.legend && (
                                <div className="flex flex-wrap items-center gap-3">
                                    {calendarData.legend.slice(0, 5).map(item => (
                                        <span key={item.status} className="flex items-center gap-1.5 text-xs">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                            <span className="text-gray-600">{item.label}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Week Days */}
                        <div className="grid grid-cols-7 gap-2 mb-3">
                            {weekDays.map(day => (
                                <div key={day} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {calendarData?.calendar_weeks?.map((week, weekIndex) => 
                                week.map((dayData, dayIndex) => {
                                    if (!dayData) {
                                        return <div key={`empty-${weekIndex}-${dayIndex}`} className="aspect-square" />;
                                    }

                                    const statusBadge = getStatusBadge(dayData.status);
                                    const isToday = dayData.is_today;

                                    return (
                                        <motion.button
                                            key={`${weekIndex}-${dayIndex}`}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => handleDayClick(dayData)}
                                            className={`aspect-square rounded-lg border p-2 transition-all ${getStatusColor(dayData.status, isToday)}`}
                                        >
                                            <div className="h-full flex flex-col">
                                                <div className="flex items-start justify-between">
                                                    <span className={`text-sm font-medium ${isToday ? 'text-indigo-700' : ''}`}>
                                                        {dayData.day}
                                                    </span>
                                                    {dayData.has_attendance && (
                                                        <span className="text-[8px] font-medium px-1 py-0.5 bg-white bg-opacity-50 rounded">
                                                            {dayData.status === 'present' ? '✓' : dayData.status === 'absent' ? '✗' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                {dayData.status !== 'future' && dayData.status !== 'weekly_off' && (
                                                    <div className="mt-auto">
                                                        <span className="text-[9px] font-medium block truncate">
                                                            {statusBadge.label}
                                                        </span>
                                                    </div>
                                                )}
                                                {dayData.is_weekly_off && (
                                                    <span className="text-[9px] text-gray-500 mt-auto">Week Off</span>
                                                )}
                                            </div>
                                        </motion.button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Calendar Footer with Summary */}
                    {calendarData?.summary && (
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                                <span className="text-gray-600">
                                    <span className="font-medium text-gray-900">Total:</span> {calendarData.summary.total_days}
                                </span>
                                <span className="text-emerald-600">
                                    <span className="font-medium">Present:</span> {calendarData.summary.present}
                                </span>
                                <span className="text-rose-600">
                                    <span className="font-medium">Absent:</span> {calendarData.summary.absent}
                                </span>
                                <span className="text-amber-600">
                                    <span className="font-medium">Half Day:</span> {calendarData.summary.half_day}
                                </span>
                                <span className="text-blue-600">
                                    <span className="font-medium">Leave:</span> {calendarData.summary.paid_leave}
                                </span>
                                <span className="text-purple-600">
                                    <span className="font-medium">Bonus:</span> {calendarData.summary.bonus}
                                </span>
                                <span className="text-orange-600">
                                    <span className="font-medium">Fine:</span> {calendarData.summary.fine}
                                </span>
                                <span className="text-yellow-600">
                                    <span className="font-medium">Week Off:</span> {calendarData.summary.weekly_off}
                                </span>
                                <span className="text-indigo-600 font-medium ml-auto">
                                    {calendarData.summary.attendance_percentage}% Attendance
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Day Details Modal - MODIFIED to show verify button even without attendance_id */}
                {selectedDayDetails && !showVerifyModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-xl shadow-xl max-w-md w-full"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Attendance Details - {formatDate(selectedDayDetails.date)}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedDayDetails(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className={`w-10 h-10 rounded-full ${getStatusColor(selectedDayDetails.status)} flex items-center justify-center`}>
                                            <span className="text-lg">{selectedDayDetails.icon || (selectedDayDetails.has_attendance ? '✓' : '📅')}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {selectedDayDetails.status_display || (selectedDayDetails.has_attendance ? getStatusBadge(selectedDayDetails.status).label : 'No Record')}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {selectedDayDetails.day_of_week}, {selectedDayDetails.date}
                                            </p>
                                            {selectedDayDetails.attendance_id && (
                                                <p className="text-xs text-gray-400 mt-1 font-mono">
                                                    ID: {selectedDayDetails.attendance_id}
                                                </p>
                                            )}
                                            {!selectedDayDetails.attendance_id && selectedDayDetails.status === 'future' && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    No attendance record - Create one below
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {selectedDayDetails.details && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedDayDetails.details.punch_in && (
                                                <div className="p-3 border border-gray-200 rounded-lg">
                                                    <span className="text-xs text-gray-500">Punch In</span>
                                                    <p className="font-medium text-gray-900">
                                                        {formatTime(selectedDayDetails.details.punch_in)}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedDayDetails.details.punch_out && (
                                                <div className="p-3 border border-gray-200 rounded-lg">
                                                    <span className="text-xs text-gray-500">Punch Out</span>
                                                    <p className="font-medium text-gray-900">
                                                        {formatTime(selectedDayDetails.details.punch_out)}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedDayDetails.details.total_hours && (
                                                <div className="p-3 border border-gray-200 rounded-lg">
                                                    <span className="text-xs text-gray-500">Total Hours</span>
                                                    <p className="font-medium text-gray-900">
                                                        {selectedDayDetails.details.total_hours}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedDayDetails.details.calculated_amount && (
                                                <div className="p-3 border border-gray-200 rounded-lg">
                                                    <span className="text-xs text-gray-500">Amount</span>
                                                    <p className="font-medium text-gray-900">
                                                        {formatCurrency(selectedDayDetails.details.calculated_amount)}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedDayDetails.details.total_break_minutes > 0 && (
                                                <div className="p-3 border border-gray-200 rounded-lg">
                                                    <span className="text-xs text-gray-500">Total Break Time</span>
                                                    <p className="font-medium text-gray-900">
                                                        {formatDuration(selectedDayDetails.details.total_break_minutes)}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedDayDetails.details.excess_break_minutes > 0 && (
                                                <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                                                    <span className="text-xs text-orange-600">Excess Break Time</span>
                                                    <p className="font-medium text-orange-700">
                                                        {formatDuration(selectedDayDetails.details.excess_break_minutes)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedDayDetails.details?.is_verified && (
                                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                                            Verified Attendance
                                        </div>
                                    )}

                                    {/* Admin Verify Button - MODIFIED to always show */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={openVerifyModal}
                                        className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {selectedDayDetails.attendance_id ? 'Admin Verify Attendance' : 'Create Attendance Record'}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Admin Verify Attendance Modal - MODIFIED header text */}
                {showVerifyModal && selectedDayDetails && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {selectedDayDetails.attendance_id ? 'Admin Verify Attendance' : 'Create Attendance Record'}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(selectedDayDetails.date)} - {selectedDayDetails.day_of_week}
                                        </p>
                                        {selectedDayDetails.attendance_id && (
                                            <p className="text-xs text-gray-400 mt-1 font-mono">
                                                Attendance ID: {selectedDayDetails.attendance_id}
                                            </p>
                                        )}
                                        {!selectedDayDetails.attendance_id && (
                                            <p className="text-xs text-amber-600 mt-1">
                                                No existing record - This will create a new attendance entry
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowVerifyModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Quick Action Presets - MODIFIED to add quick actions */}
                                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                                    <p className="text-xs font-medium text-blue-700 mb-2">Quick Actions:</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => {
                                                setVerifyFormData({
                                                    ...verifyFormData,
                                                    verify_status: 'present',
                                                    manual_punch_in: `${selectedDayDetails.date}T09:00:00`,
                                                    manual_punch_out: `${selectedDayDetails.date}T18:00:00`,
                                                    admin_remarks: 'Admin created - standard working hours'
                                                });
                                            }}
                                            className="px-2 py-1 text-xs bg-white text-blue-700 rounded border border-blue-200 hover:bg-blue-50"
                                        >
                                            Mark Present (9-6)
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVerifyFormData({
                                                    ...verifyFormData,
                                                    verify_status: 'absent',
                                                    manual_punch_in: '',
                                                    manual_punch_out: '',
                                                    admin_remarks: 'Marked absent - no punch in record'
                                                });
                                            }}
                                            className="px-2 py-1 text-xs bg-white text-red-700 rounded border border-red-200 hover:bg-red-50"
                                        >
                                            Mark Absent
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVerifyFormData({
                                                    ...verifyFormData,
                                                    verify_status: 'half_day',
                                                    manual_punch_in: `${selectedDayDetails.date}T14:00:00`,
                                                    manual_punch_out: `${selectedDayDetails.date}T18:00:00`,
                                                    admin_remarks: 'Half day - approved'
                                                });
                                            }}
                                            className="px-2 py-1 text-xs bg-white text-amber-700 rounded border border-amber-200 hover:bg-amber-50"
                                        >
                                            Half Day (2-6)
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVerifyFormData({
                                                    ...verifyFormData,
                                                    verify_status: 'paid_leave',
                                                    manual_punch_in: '',
                                                    manual_punch_out: '',
                                                    admin_remarks: 'Paid leave approved'
                                                });
                                            }}
                                            className="px-2 py-1 text-xs bg-white text-purple-700 rounded border border-purple-200 hover:bg-purple-50"
                                        >
                                            Paid Leave
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVerifyFormData({
                                                    ...verifyFormData,
                                                    verify_status: 'bonus',
                                                    manual_punch_in: `${selectedDayDetails.date}T08:00:00`,
                                                    manual_punch_out: `${selectedDayDetails.date}T20:00:00`,
                                                    admin_remarks: 'Overtime - project work'
                                                });
                                            }}
                                            className="px-2 py-1 text-xs bg-white text-green-700 rounded border border-green-200 hover:bg-green-50"
                                        >
                                            Bonus/Overtime
                                        </button>
                                    </div>
                                </div>

                                {/* Current Status Display - Only show if details exist */}
                                {selectedDayDetails.details && (
                                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                        <p className="text-xs text-gray-500 mb-1">Current Status</p>
                                        <p className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getStatusBadge(selectedDayDetails.status).color}`}>
                                            {getStatusBadge(selectedDayDetails.status).label}
                                        </p>
                                    </div>
                                )}

                                {/* Verify Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Verification Status *
                                    </label>
                                    <select
                                        value={verifyFormData.verify_status}
                                        onChange={(e) => setVerifyFormData({...verifyFormData, verify_status: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="present">Present</option>
                                        <option value="absent">Absent</option>
                                        <option value="half_day">Half Day</option>
                                        <option value="paid_leave">Paid Leave</option>
                                        <option value="bonus">Bonus (Overtime)</option>
                                        <option value="fine">Fine</option>
                                    </select>
                                </div>

                                {/* Consider Break - Only show for present/half_day */}
                                {(verifyFormData.verify_status === 'present' || verifyFormData.verify_status === 'half_day') && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            id="consider_break"
                                            checked={verifyFormData.consider_break}
                                            onChange={(e) => setVerifyFormData({...verifyFormData, consider_break: e.target.checked})}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="consider_break" className="text-sm text-gray-700">
                                            Consider Break Time (Deduct excess break minutes from working hours)
                                        </label>
                                    </div>
                                )}

                                {/* Manual Time Correction Section - Only show for present/half_day */}
                                {(verifyFormData.verify_status === 'present' || verifyFormData.verify_status === 'half_day') && (
                                    <div className="border-t border-gray-200 pt-4 mt-2">
                                        <h4 className="text-sm font-medium text-gray-900 mb-3">Manual Time Correction (Optional)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Manual Punch In
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={verifyFormData.manual_punch_in}
                                                    onChange={(e) => setVerifyFormData({...verifyFormData, manual_punch_in: e.target.value})}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Manual Punch Out
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={verifyFormData.manual_punch_out}
                                                    onChange={(e) => setVerifyFormData({...verifyFormData, manual_punch_out: e.target.value})}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Note: If no times are provided, system will use default times based on status
                                        </p>
                                    </div>
                                )}

                                {/* Allowances & Deductions - Only show for present/bonus */}
                                {(verifyFormData.verify_status === 'present' || verifyFormData.verify_status === 'bonus') && (
                                    <div className="border-t border-gray-200 pt-4 mt-2">
                                        <h4 className="text-sm font-medium text-gray-900 mb-3">Allowances & Deductions</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="travel_allowance"
                                                    checked={verifyFormData.apply_travel_allowance}
                                                    onChange={(e) => setVerifyFormData({...verifyFormData, apply_travel_allowance: e.target.checked})}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor="travel_allowance" className="text-sm text-gray-700">
                                                    Apply Travel Allowance
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="other_deductions"
                                                    checked={verifyFormData.apply_other_deductions}
                                                    onChange={(e) => setVerifyFormData({...verifyFormData, apply_other_deductions: e.target.checked})}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor="other_deductions" className="text-sm text-gray-700">
                                                    Apply Other Deductions
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Admin Remarks */}
                                <div className="border-t border-gray-200 pt-4 mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Admin Remarks *
                                    </label>
                                    <textarea
                                        rows="3"
                                        value={verifyFormData.admin_remarks}
                                        onChange={(e) => setVerifyFormData({...verifyFormData, admin_remarks: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Add verification remarks..."
                                        required
                                    />
                                </div>

                                {/* Summary of changes - MODIFIED to show summary */}
                                <div className="bg-gray-50 rounded-lg p-3 text-xs">
                                    <p className="font-medium text-gray-700 mb-1">Summary:</p>
                                    <ul className="space-y-1 text-gray-600">
                                        <li>• Status will be set to: <span className="font-medium capitalize">{verifyFormData.verify_status}</span></li>
                                        {!selectedDayDetails.attendance_id && <li>• New attendance record will be created</li>}
                                        {verifyFormData.manual_punch_in && verifyFormData.manual_punch_out && (
                                            <li>• Working hours: {verifyFormData.manual_punch_in.split('T')[1]} - {verifyFormData.manual_punch_out.split('T')[1]}</li>
                                        )}
                                        {verifyFormData.consider_break && (verifyFormData.verify_status === 'present' || verifyFormData.verify_status === 'half_day') && (
                                            <li>• Break time will be considered in calculation</li>
                                        )}
                                    </ul>
                                </div>

                                {/* Action Buttons - MODIFIED button text */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
                                    <button
                                        onClick={() => setShowVerifyModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleVerifyAttendance}
                                        disabled={verifyLoading}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {verifyLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            selectedDayDetails.attendance_id ? 'Submit Verification' : 'Create & Submit'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AttendanceTab;