import React, { useState, useEffect } from 'react';
import {
    FiChevronLeft,
    FiChevronRight,
    FiCalendar,
    FiCheck,
    FiCheckCircle,
    FiXCircle,
    FiUser,
    FiPhone,
    FiClock,
    FiAlertTriangle,
    FiDollarSign,
    FiUsers,
    FiRefreshCw,
    FiFilter,
    FiSearch,
    FiEdit,
    FiEye,
    FiDownload,
    FiPrinter,
    FiSend,
    FiMoreVertical,
    FiCheckSquare,
    FiXSquare,
    FiStar,
    FiAward,
    FiMinusCircle,
    FiPlusCircle,
    FiTrendingUp,
    FiTrendingDown,
    FiInfo,
    FiList,
    FiCheckCircle as FiBulkVerify,
    FiBriefcase,
    FiMail
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { toast } from 'react-hot-toast';

const ManageAttendance = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState({});
    const [bulkVerifyLoading, setBulkVerifyLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState([]);
    const [absentStaff, setAbsentStaff] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedStaff, setSelectedStaff] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [summary, setSummary] = useState({
        total_staff: 0,
        present: 0,
        absent: 0,
        breakdown: {
            present: 0,
            half_day: 0,
            paid_leave: 0,
            fine: 0,
            bonus: 0,
            pending: 0
        }
    });

    // Bulk Verify Modal State
    const [showBulkVerifyModal, setShowBulkVerifyModal] = useState(false);
    const [bulkVerifyData, setBulkVerifyData] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [commonRemarks, setCommonRemarks] = useState('');

    // Modal state for manual verification
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [verifyForm, setVerifyForm] = useState({
        verify_status: 'present',
        manual_punch_in: '',
        manual_punch_out: '',
        admin_remarks: '',
        isManual: false
    });

    // Modal state for salary calculation
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [salaryData, setSalaryData] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [salaryLoading, setSalaryLoading] = useState(false);
    const [selectedStaffForSalary, setSelectedStaffForSalary] = useState(null);
    const [activeTab, setActiveTab] = useState('full');

    // Departments for filter (will be populated from API)
    const [departments, setDepartments] = useState(['All Departments']);

    // Format date for API (YYYY-MM-DD)
    const formatDateForAPI = (date) => {
        return date.toISOString().split('T')[0];
    };

    // Format date for display
    const formatDisplayDate = (date) => {
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getDayName = (date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    // Format time for display
    const formatTimeDisplay = (time) => {
        if (!time || time === '00:00:00') return 'Not Marked';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Format datetime for display
    const formatDateTime = (datetime) => {
        if (!datetime) return 'Not Marked';
        const date = new Date(datetime);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const baseClasses = "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200";

        switch (status?.code || status) {
            case 'present':
                return `${baseClasses} bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200 shadow-sm hover:shadow`;
            case 'half_day':
            case 'half day':
                return `${baseClasses} bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200 shadow-sm hover:shadow`;
            case 'absent':
                return `${baseClasses} bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200 shadow-sm hover:shadow`;
            case 'paid_leave':
            case 'paid leave':
                return `${baseClasses} bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200 shadow-sm hover:shadow`;
            case 'bonus':
                return `${baseClasses} bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200 shadow-sm hover:shadow`;
            case 'fine':
                return `${baseClasses} bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200 shadow-sm hover:shadow`;
            case 'pending':
                return `${baseClasses} bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200 shadow-sm hover:shadow`;
            case 'weekly_off':
                return `${baseClasses} bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-800 border border-indigo-200 shadow-sm hover:shadow`;
            default:
                return `${baseClasses} bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200 shadow-sm hover:shadow`;
        }
    };

    // Get status icon
    const getStatusIcon = (status) => {
        const statusCode = status?.code || status;
        switch (statusCode) {
            case 'present': return <FiCheckCircle className="w-3 h-3" />;
            case 'half_day': return <FiAlertTriangle className="w-3 h-3" />;
            case 'absent': return <FiXCircle className="w-3 h-3" />;
            case 'paid_leave': return <FiDollarSign className="w-3 h-3" />;
            case 'bonus': return <FiAward className="w-3 h-3" />;
            case 'fine': return <FiMinusCircle className="w-3 h-3" />;
            case 'pending': return <FiClock className="w-3 h-3" />;
            case 'weekly_off': return <FiCalendar className="w-3 h-3" />;
            default: return <FiClock className="w-3 h-3" />;
        }
    };

    // Get status display text
    const getStatusDisplay = (status) => {
        if (status?.display) return status.display;
        if (typeof status === 'string') {
            return status.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        return 'Unknown';
    };

    // Get available status options based on feature status
    const getAvailableStatusOptions = (featureStatus, currentStatus) => {
        const options = [
            { value: 'present', label: 'Present', selected: currentStatus === 'present', enabled: true }
        ];
        
        // OT/Bonus option - only if enabled
        if (featureStatus?.overtime?.enabled) {
            options.push({ 
                value: 'bonus', 
                label: 'Bonus (OT)', 
                selected: currentStatus === 'bonus',
                enabled: true
            });
        } else {
            options.push({ 
                value: 'bonus', 
                label: 'Bonus (OT)', 
                selected: false,
                enabled: false,
                disabled_reason: 'Overtime not enabled for this employee'
            });
        }
        
        options.push({ value: 'half_day', label: 'Half Day', selected: currentStatus === 'half_day', enabled: true });
        options.push({ value: 'paid_leave', label: 'Paid Leave', selected: currentStatus === 'paid_leave', enabled: true });
        options.push({ value: 'absent', label: 'Absent', selected: currentStatus === 'absent', enabled: true });
        
        // Fine option - only if enabled
        if (featureStatus?.fine?.enabled) {
            options.push({ 
                value: 'fine', 
                label: 'Fine', 
                selected: currentStatus === 'fine',
                enabled: true
            });
        } else {
            options.push({ 
                value: 'fine', 
                label: 'Fine', 
                selected: false,
                enabled: false,
                disabled_reason: 'Fine not enabled for this employee'
            });
        }
        
        return options;
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

    // Fetch attendance data when date or filter changes
    useEffect(() => {
        fetchAttendanceData();
    }, [selectedDate, filterDepartment]);

    // Extract unique departments from attendance data
    useEffect(() => {
        const depts = new Set();
        attendanceData.forEach(staff => {
            if (staff.department) {
                depts.add(staff.department);
            }
        });
        absentStaff.forEach(staff => {
            if (staff.department) {
                depts.add(staff.department);
            }
        });
        setDepartments(['All Departments', ...Array.from(depts)]);
    }, [attendanceData, absentStaff]);

    // Fetch attendance data from API
    const fetchAttendanceData = async () => {
        setTableLoading(true);
        try {
            const dateStr = formatDateForAPI(selectedDate);
            const response = await fetch(
                `${API_BASE_URL}/attendance/by-date?date=${dateStr}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch attendance data');
            }

            const result = await response.json();
            
            if (result.success) {
                const presentStaff = result.data.attendance.map(item => ({
                    attendance_id: item.attendance_id,
                    username: item.username,
                    name: item.profile.name,
                    mobile: item.profile.mobile,
                    email: item.profile.email,
                    image: item.profile.image,
                    designation: item.profile.designation,
                    department: item.profile.designation || 'General',
                    // Duty time from salary settings
                    duty_time: {
                        start: item.duty_time?.expected?.start_time || '09:00',
                        end: item.duty_time?.expected?.end_time || '18:00',
                        schedule: item.duty_time?.expected?.schedule || '09:00 to 18:00',
                        expected_hours: item.duty_time?.expected?.hours || 8
                    },
                    status: item.status,
                    feature_status: item.feature_status,
                    in_time: item.punch_details?.punch_in?.time || '00:00',
                    out_time: item.punch_details?.punch_out?.time || '00:00',
                    in_datetime: item.punch_details?.punch_in?.datetime,
                    out_datetime: item.punch_details?.punch_out?.datetime,
                    punch_in_status: item.punch_details?.punch_in?.status,
                    punch_out_status: item.punch_details?.punch_out?.status,
                    working_hours: item.working_hours,
                    is_verified: item.status.is_verified,
                    is_manual: item.is_manual,
                    manual_reason: item.manual_reason,
                    salary: item.salary,
                    available_options: getAvailableStatusOptions(item.feature_status, item.status.code)
                }));

                const absentStaffData = result.data.absent_staff.map(item => ({
                    attendance_id: `absent-${item.username}`,
                    username: item.username,
                    name: item.profile.name,
                    mobile: item.profile.mobile,
                    email: item.profile.email,
                    image: item.profile.image,
                    designation: item.profile.designation,
                    department: item.profile.designation || 'General',
                    duty_time: {
                        start: item.duty_time?.expected?.start_time || '09:00',
                        end: item.duty_time?.expected?.end_time || '18:00',
                        schedule: item.duty_time?.expected?.schedule || '09:00 to 18:00',
                        expected_hours: item.duty_time?.expected?.hours || 8
                    },
                    status: { code: 'absent', display: '❌ Absent', is_verified: false },
                    feature_status: item.feature_status,
                    in_time: '00:00',
                    out_time: '00:00',
                    is_verified: false,
                    salary: item.salary,
                    available_options: getAvailableStatusOptions(item.feature_status, 'absent')
                }));

                setAttendanceData(presentStaff);
                setAbsentStaff(absentStaffData);
                setSummary(result.data.summary);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
            toast.error('Failed to load attendance data');
        } finally {
            setTableLoading(false);
        }
    };

    // Fetch salary calculation
    const fetchSalaryCalculation = async (username, month, year) => {
        setSalaryLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/salary-calculation/${username}?month=${month}&year=${year}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch salary data');
            }

            const result = await response.json();
            
            if (result.success) {
                setSalaryData(result.data);
                setShowSalaryModal(true);
            } else {
                toast.error(result.message || 'Failed to load salary data');
            }
        } catch (error) {
            console.error('Error fetching salary:', error);
            toast.error('Failed to load salary calculation');
        } finally {
            setSalaryLoading(false);
        }
    };

    // Open salary modal
    const openSalaryModal = (staff) => {
        setSelectedStaffForSalary(staff);
        setActiveTab('full');
        fetchSalaryCalculation(staff.username, selectedMonth, selectedYear);
    };

    // Verify attendance
    const verifyAttendance = async () => {
        if (!selectedAttendance) return;

        setVerifyLoading(prev => ({ ...prev, [selectedAttendance.attendance_id]: true }));
        
        try {
            const payload = {
                attendance_id: selectedAttendance.attendance_id,
                verify_status: verifyForm.verify_status,
                admin_remarks: verifyForm.admin_remarks || `Verified as ${verifyForm.verify_status}`
            };

            if (verifyForm.manual_punch_in) {
                payload.manual_punch_in = verifyForm.manual_punch_in;
            }
            if (verifyForm.manual_punch_out) {
                payload.manual_punch_out = verifyForm.manual_punch_out;
            }

            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/verify`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                throw new Error('Failed to verify attendance');
            }

            const result = await response.json();
            
            if (result.success) {
                toast.success('Attendance verified successfully');
                setShowVerifyModal(false);
                setSelectedAttendance(null);
                setVerifyForm({
                    verify_status: 'present',
                    manual_punch_in: '',
                    manual_punch_out: '',
                    admin_remarks: '',
                    isManual: false
                });
                fetchAttendanceData();
            }
        } catch (error) {
            console.error('Error verifying attendance:', error);
            toast.error('Failed to verify attendance');
        } finally {
            setVerifyLoading(prev => ({ ...prev, [selectedAttendance.attendance_id]: false }));
        }
    };

    // Open verify modal
    const openVerifyModal = (attendance) => {
        setSelectedAttendance(attendance);
        setVerifyForm({
            verify_status: attendance.status?.code || 'present',
            manual_punch_in: attendance.in_datetime ? 
                new Date(attendance.in_datetime).toISOString().slice(0, 16) : '',
            manual_punch_out: attendance.out_datetime ? 
                new Date(attendance.out_datetime).toISOString().slice(0, 16) : '',
            admin_remarks: attendance.status?.remarks || '',
            isManual: false
        });
        setShowVerifyModal(true);
    };

    // Open Bulk Verify Modal
    const openBulkVerifyModal = () => {
        const selectedStaffList = [...attendanceData, ...absentStaff].filter(
            staff => selectedStaff.has(staff.attendance_id)
        );
        
        if (selectedStaffList.length === 0) {
            toast.error('Please select staff members to verify');
            return;
        }
        
        // Prepare bulk verify data with actual times
        const bulkData = selectedStaffList.map(staff => {
            let workingHours = null;
            let actualStatus = 'pending';
            let extraMinutes = 0;
            let lessMinutes = 0;
            let totalMinutes = 0;
            
            if (staff.in_time !== '00:00' && staff.out_time !== '00:00') {
                const [inHour, inMin] = staff.in_time.split(':');
                const [outHour, outMin] = staff.out_time.split(':');
                const inTotal = parseInt(inHour) * 60 + parseInt(inMin);
                const outTotal = parseInt(outHour) * 60 + parseInt(outMin);
                totalMinutes = outTotal - inTotal;
                
                const standardMinutes = (staff.duty_time?.expected_hours || 8) * 60;
                const difference = totalMinutes - standardMinutes;
                
                if (difference > 0 && staff.feature_status?.overtime?.enabled) {
                    actualStatus = 'bonus';
                    extraMinutes = difference;
                    lessMinutes = 0;
                } else if (difference < 0 && staff.feature_status?.fine?.enabled) {
                    actualStatus = 'fine';
                    extraMinutes = 0;
                    lessMinutes = Math.abs(difference);
                } else {
                    actualStatus = 'present';
                    extraMinutes = 0;
                    lessMinutes = 0;
                }
            } else if (staff.in_time === '00:00' && staff.out_time === '00:00') {
                actualStatus = 'absent';
                totalMinutes = 0;
            }
            
            return {
                attendance_id: staff.attendance_id,
                username: staff.username,
                name: staff.name,
                designation: staff.designation,
                in_time: staff.in_time,
                out_time: staff.out_time,
                duty_time: staff.duty_time,
                actual_status: actualStatus,
                total_minutes: totalMinutes,
                total_hours: (totalMinutes / 60).toFixed(2),
                extra_minutes: extraMinutes,
                less_minutes: lessMinutes,
                current_status: staff.status?.code || 'pending',
                feature_status: staff.feature_status
            };
        });
        
        setBulkVerifyData(bulkData);
        setSelectedStatus('');
        setCommonRemarks('');
        setShowBulkVerifyModal(true);
    };

    // Handle Bulk Verification
    const handleBulkVerify = async () => {
        setBulkVerifyLoading(true);
        
        try {
            const selectedIds = Array.from(selectedStaff);
            const attendanceIds = selectedIds.filter(id => !id.startsWith('absent-'));
            
            if (attendanceIds.length === 0) {
                toast.error('No valid attendance records selected');
                return;
            }
            
            const payload = {
                attendance_ids: attendanceIds,
                ...(selectedStatus && { verify_status: selectedStatus }),
                admin_remarks: commonRemarks || `Bulk verified`
            };
            
            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/bulk-verify`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to bulk verify attendance');
            }
            
            const result = await response.json();
            
            if (result.success) {
                toast.success(result.message);
                setShowBulkVerifyModal(false);
                setSelectedStaff(new Set());
                fetchAttendanceData();
            } else {
                toast.error(result.message || 'Failed to bulk verify');
            }
        } catch (error) {
            console.error('Error in bulk verification:', error);
            toast.error('Failed to complete bulk verification');
        } finally {
            setBulkVerifyLoading(false);
        }
    };

    // Date navigation
    const navigateDate = (direction) => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setDate(newDate.getDate() - 1);
            } else if (direction === 'next') {
                newDate.setDate(newDate.getDate() + 1);
            } else if (direction === 'today') {
                return new Date();
            }
            return newDate;
        });
    };

    // Selection handlers
    const toggleStaffSelection = (staffId) => {
        const newSelected = new Set(selectedStaff);
        if (newSelected.has(staffId)) {
            newSelected.delete(staffId);
        } else {
            newSelected.add(staffId);
        }
        setSelectedStaff(newSelected);
    };

    const selectAllStaff = () => {
        const allStaff = [...attendanceData, ...absentStaff];
        if (selectedStaff.size === allStaff.length) {
            setSelectedStaff(new Set());
        } else {
            const allIds = allStaff.map(staff => staff.attendance_id);
            setSelectedStaff(new Set(allIds));
        }
    };

    const clearSelection = () => {
        setSelectedStaff(new Set());
        setBulkAction('');
    };

    // Get filtered data based on search and department
    const getFilteredData = () => {
        const allStaff = [...attendanceData, ...absentStaff];
        
        return allStaff.filter(staff => {
            if (filterDepartment && filterDepartment !== 'All Departments') {
                if (staff.department !== filterDepartment) return false;
            }
            
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    staff.name.toLowerCase().includes(query) ||
                    staff.mobile.includes(query) ||
                    staff.designation?.toLowerCase().includes(query) ||
                    staff.email?.toLowerCase().includes(query)
                );
            }
            
            return true;
        });
    };

    const filteredData = getFilteredData();
    const allSelected = selectedStaff.size === filteredData.length && filteredData.length > 0;

    // Skeleton Loader
    const TableSkeleton = () => (
        <>
            {Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="border-b border-gray-200 animate-pulse">
                    <td className="px-6 py-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-32"></div>
                                <div className="h-3 bg-gray-200 rounded w-24"></div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-28"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-8 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-5 bg-gray-200 rounded w-9 mx-auto"></div>
                    </td>
                </tr>
            ))}
        </>
    );

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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Stats Cards */}
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
                                    <h3 className="text-lg font-bold mt-1">{summary.total_staff} Members</h3>
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
                                    <p className="text-emerald-100 text-xs font-medium">Present Today</p>
                                    <h3 className="text-lg font-bold mt-1">{summary.present} Staff</h3>
                                </div>
                                <FiCheckCircle className="w-5 h-5 opacity-80" />
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
                                    <p className="text-red-100 text-xs font-medium">Absent Today</p>
                                    <h3 className="text-lg font-bold mt-1">{summary.absent} Staff</h3>
                                </div>
                                <FiXCircle className="w-5 h-5 opacity-80" />
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
                                    <p className="text-purple-100 text-xs font-medium">Pending Verification</p>
                                    <h3 className="text-lg font-bold mt-1">{summary.verification?.pending || 0} Staff</h3>
                                </div>
                                <FiClock className="w-5 h-5 opacity-80" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Date Navigation Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6"
                    >
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <FiCalendar className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-800">
                                        Attendance Management
                                    </h2>
                                </div>
                                <p className="text-gray-500 text-xs font-medium">
                                    Verify and manage staff attendance
                                </p>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search staff..."
                                            className="pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-colors w-full lg:w-64 shadow-sm"
                                        />
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>

                                    <div className="relative">
                                        <select
                                            value={filterDepartment}
                                            onChange={(e) => setFilterDepartment(e.target.value)}
                                            className="pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-colors appearance-none w-full lg:w-48 shadow-sm"
                                        >
                                            {departments.map(dept => (
                                                <option key={dept} value={dept === 'All Departments' ? '' : dept}>
                                                    {dept}
                                                </option>
                                            ))}
                                        </select>
                                        <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>

                                    <motion.button
                                        onClick={fetchAttendanceData}
                                        disabled={tableLoading}
                                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow disabled:opacity-50"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiRefreshCw className={`w-4 h-4 ${tableLoading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-700 text-sm font-medium">Selected Date:</span>
                                    <span className="text-gray-900 font-bold text-lg">{getDayName(selectedDate)}, {formatDisplayDate(selectedDate)}</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-gray-50 rounded-lg p-2 shadow-sm">
                                        <button
                                            onClick={() => navigateDate('prev')}
                                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-all duration-200 hover:shadow"
                                        >
                                            <FiChevronLeft className="w-5 h-5" />
                                        </button>

                                        <div className="flex flex-col items-center px-4 py-2 min-w-40">
                                            <div className="text-sm font-semibold text-gray-800">
                                                {formatDisplayDate(selectedDate)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {getDayName(selectedDate)}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => navigateDate('next')}
                                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-all duration-200 hover:shadow"
                                        >
                                            <FiChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => navigateDate('today')}
                                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                                    >
                                        <FiCalendar className="w-4 h-4" />
                                        Today
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Enhanced Bulk Action Bar */}
                    <AnimatePresence>
                        {selectedStaff.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 mb-6 shadow-lg"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-2 shadow-sm">
                                            <FiCheck className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-blue-900 text-sm">
                                                {selectedStaff.size} staff member{selectedStaff.size !== 1 ? 's' : ''} selected
                                            </h3>
                                            <p className="text-blue-700 text-xs">
                                                Choose an action to apply to all selected staff
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={clearSelection}
                                            className="px-3 py-1.5 text-blue-700 hover:text-blue-900 font-medium text-xs rounded-lg border border-blue-300 bg-white hover:bg-blue-50 transition-colors"
                                        >
                                            Clear Selection
                                        </button>
                                        
                                        <button
                                            onClick={openBulkVerifyModal}
                                            disabled={bulkVerifyLoading}
                                            className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium text-xs rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow disabled:opacity-50"
                                        >
                                            <FiBulkVerify className="w-3 h-3" />
                                            Bulk Verify (Actual Time)
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Enhanced Attendance List Card */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            STAFF MEMBER
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            CONTACT & DESIGNATION
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            DUTY TIME
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            CURRENT STATUS
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            TIME & DURATION
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            ACTIONS
                                        </th>
                                        <th className="w-12 px-6 py-4 text-left">
                                            <div className="flex items-center justify-center">
                                                <div 
                                                    onClick={selectAllStaff}
                                                    className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-all duration-200 ${allSelected ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                                                    title={allSelected ? "Deselect All" : "Select All"}
                                                >
                                                    <div 
                                                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-all duration-200 ${allSelected ? 'translate-x-6' : 'translate-x-1'}`}
                                                    />
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {tableLoading ? (
                                        <TableSkeleton />
                                    ) : filteredData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-gray-100 rounded-full mb-3">
                                                        <FiUser className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-600 text-sm font-medium mb-1">No staff records found</p>
                                                    <p className="text-gray-500 text-xs mb-4">Try adjusting your search or filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredData.map((staff) => (
                                            <tr
                                                key={staff.attendance_id}
                                                className={`transition-all duration-150 ${selectedStaff.has(staff.attendance_id) 
                                                    ? 'bg-gradient-to-r from-blue-50 to-blue-25' 
                                                    : 'hover:bg-blue-50/20'
                                                }`}
                                            >
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-sm">
                                                            <span className="text-white font-bold text-xs">
                                                                {staff.name?.split(' ').map(n => n[0]).join('') || 'NA'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {staff.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                <FiUser className="w-3 h-3" />
                                                                {staff.designation || 'No Designation'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-gray-800 font-medium text-xs">
                                                            <FiPhone className="w-3 h-3 text-blue-500" />
                                                            {staff.mobile}
                                                        </div>
                                                        {staff.email && (
                                                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                                                                <FiMail className="w-3 h-3" />
                                                                {staff.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                            <FiClock className="w-4 h-4 text-blue-500" />
                                                            {staff.duty_time?.schedule || '09:00 to 18:00'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Expected: {staff.duty_time?.expected_hours || 8} hours
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center gap-2 ${getStatusBadge(staff.status)}`}>
                                                            {getStatusIcon(staff.status)}
                                                            <span className="text-xs font-semibold">
                                                                {getStatusDisplay(staff.status)}
                                                            </span>
                                                        </span>
                                                        {staff.status?.is_verified && (
                                                            <span className="text-xs text-green-600">
                                                                ✓ Verified
                                                            </span>
                                                        )}
                                                        {/* Show OT/Fine status badges */}
                                                        {staff.feature_status && (
                                                            <div className="flex gap-1 mt-1">
                                                                {!staff.feature_status.overtime?.enabled && (
                                                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                        OT Disabled
                                                                    </span>
                                                                )}
                                                                {!staff.feature_status.fine?.enabled && (
                                                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                        Fine Disabled
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 align-middle">
                                                    {staff.in_time !== '00:00' ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium text-green-700">
                                                                    In: {formatTimeDisplay(staff.in_time)}
                                                                </span>
                                                                {staff.punch_in_status && (
                                                                    <span className={`text-xs ${staff.punch_in_status.is_late ? 'text-red-500' : staff.punch_in_status.is_early ? 'text-orange-500' : 'text-green-500'}`}>
                                                                        ({staff.punch_in_status.formatted})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium text-blue-700">
                                                                    Out: {formatTimeDisplay(staff.out_time)}
                                                                </span>
                                                                {staff.punch_out_status && (
                                                                    <span className={`text-xs ${staff.punch_out_status.is_early ? 'text-red-500' : staff.punch_out_status.is_late ? 'text-purple-500' : 'text-green-500'}`}>
                                                                        ({staff.punch_out_status.formatted})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {staff.working_hours && (
                                                                <div className="text-xs text-gray-500">
                                                                    Worked: {staff.working_hours.formatted}
                                                                    {staff.working_hours.extra_minutes > 0 && staff.feature_status?.overtime?.enabled && (
                                                                        <span className="text-green-600 ml-1">
                                                                            (+{Math.floor(staff.working_hours.extra_minutes/60)}h extra)
                                                                        </span>
                                                                    )}
                                                                    {staff.working_hours.less_minutes > 0 && staff.feature_status?.fine?.enabled && (
                                                                        <span className="text-orange-600 ml-1">
                                                                            (-{Math.floor(staff.working_hours.less_minutes/60)}h less)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 italic">
                                                            Not marked today
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-2">
                                                        {staff.status?.code !== 'absent' && (
                                                            <button
                                                                onClick={() => openVerifyModal(staff)}
                                                                disabled={verifyLoading[staff.attendance_id]}
                                                                className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200 hover:from-blue-200 hover:to-blue-100 transition-all duration-200 hover:scale-105 disabled:opacity-50 shadow-sm flex items-center gap-1"
                                                                title="Verify Attendance"
                                                            >
                                                                <FiCheckSquare className="w-3 h-3" />
                                                                {staff.status?.is_verified ? 'Re-verify' : 'Verify'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openSalaryModal(staff)}
                                                            className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 text-xs font-medium rounded-lg border border-purple-200 hover:from-purple-200 hover:to-purple-100 transition-all duration-200 hover:scale-105 shadow-sm flex items-center gap-1"
                                                            title="View Salary"
                                                        >
                                                            <FiDollarSign className="w-3 h-3" />
                                                            Salary
                                                        </button>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center justify-center">
                                                        <div 
                                                            onClick={() => toggleStaffSelection(staff.attendance_id)}
                                                            className={`relative inline-flex items-center h-5 rounded-full w-9 cursor-pointer transition-all duration-200 ${selectedStaff.has(staff.attendance_id) ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                                                        >
                                                            <div 
                                                                className={`inline-block w-3 h-3 transform bg-white rounded-full transition-all duration-200 ${selectedStaff.has(staff.attendance_id) ? 'translate-x-5' : 'translate-x-1'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredData.length > 0 && (
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-3 border-t border-gray-200">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-gray-600">
                                            Showing <span className="font-semibold">{filteredData.length}</span> staff members
                                        </span>
                                        {selectedStaff.size > 0 && (
                                            <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                                                {selectedStaff.size} selected
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
                                            <FiDownload className="w-3 h-3" />
                                            Export
                                        </button>
                                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
                                            <FiPrinter className="w-3 h-3" />
                                            Print
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Individual Verification Modal with Conditional OT/Fine Options */}
            <AnimatePresence>
                {showVerifyModal && selectedAttendance && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowVerifyModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    Verify Attendance
                                </h3>
                                
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700">{selectedAttendance.name}</p>
                                    <p className="text-xs text-gray-500">{selectedAttendance.designation}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Duty Time: {selectedAttendance.duty_time?.schedule || '09:00 to 18:00'}
                                    </p>
                                </div>

                                {selectedAttendance.in_time !== '00:00' && (
                                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                            <FiClock className="w-3 h-3" />
                                            CURRENT PUNCH TIMES
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-blue-600">Punch In</p>
                                                <p className="text-sm font-medium text-blue-900">
                                                    {formatDateTime(selectedAttendance.in_datetime) || formatTimeDisplay(selectedAttendance.in_time)}
                                                </p>
                                                {selectedAttendance.punch_in_status && (
                                                    <p className="text-xs text-orange-600 mt-1">
                                                        {selectedAttendance.punch_in_status.formatted}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600">Punch Out</p>
                                                <p className="text-sm font-medium text-blue-900">
                                                    {selectedAttendance.out_time !== '00:00' 
                                                        ? (formatDateTime(selectedAttendance.out_datetime) || formatTimeDisplay(selectedAttendance.out_time))
                                                        : 'Not Marked'}
                                                </p>
                                                {selectedAttendance.punch_out_status && (
                                                    <p className="text-xs text-orange-600 mt-1">
                                                        {selectedAttendance.punch_out_status.formatted}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {selectedAttendance.working_hours && (
                                            <div className="mt-2 pt-2 border-t border-blue-200">
                                                <p className="text-xs text-blue-600">Total Working Hours</p>
                                                <p className="text-sm font-medium text-blue-900">
                                                    {selectedAttendance.working_hours.formatted}
                                                    {selectedAttendance.working_hours.extra_minutes > 0 && selectedAttendance.feature_status?.overtime?.enabled && (
                                                        <span className="text-green-600 ml-2 text-xs">
                                                            (+{Math.floor(selectedAttendance.working_hours.extra_minutes/60)}h {selectedAttendance.working_hours.extra_minutes % 60}m extra)
                                                        </span>
                                                    )}
                                                    {selectedAttendance.working_hours.less_minutes > 0 && selectedAttendance.feature_status?.fine?.enabled && (
                                                        <span className="text-orange-600 ml-2 text-xs">
                                                            (-{Math.floor(selectedAttendance.working_hours.less_minutes/60)}h {selectedAttendance.working_hours.less_minutes % 60}m less)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Verification Status
                                        </label>
                                        <div className="space-y-2">
                                            {selectedAttendance.available_options?.map((option) => (
                                                <label
                                                    key={option.value}
                                                    className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer ${
                                                        verifyForm.verify_status === option.value
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                    } ${!option.enabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="verify_status"
                                                        value={option.value}
                                                        checked={verifyForm.verify_status === option.value}
                                                        onChange={(e) => {
                                                            if (option.enabled) {
                                                                setVerifyForm({...verifyForm, verify_status: e.target.value});
                                                                if (option.value === 'bonus' && selectedAttendance.working_hours?.extra_minutes === 0) {
                                                                    toast('No extra hours detected. Please verify working hours.', {
                                                                        icon: '⚠️'
                                                                    });
                                                                }
                                                                if (option.value === 'fine' && selectedAttendance.working_hours?.less_minutes === 0) {
                                                                    toast('No less hours detected. Please verify working hours.', {
                                                                        icon: '⚠️'
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                        disabled={!option.enabled}
                                                        className="mr-3"
                                                    />
                                                    <div className="flex-1">
                                                        <span className={`font-medium ${verifyForm.verify_status === option.value ? 'text-blue-700' : 'text-gray-700'}`}>
                                                            {option.label}
                                                        </span>
                                                        {!option.enabled && option.disabled_reason && (
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {option.disabled_reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {option.value === 'bonus' && (
                                                        <FiAward className={`w-4 h-4 ${verifyForm.verify_status === option.value ? 'text-purple-500' : 'text-gray-300'}`} />
                                                    )}
                                                    {option.value === 'fine' && (
                                                        <FiMinusCircle className={`w-4 h-4 ${verifyForm.verify_status === option.value ? 'text-orange-500' : 'text-gray-300'}`} />
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Admin Remarks
                                        </label>
                                        <textarea
                                            value={verifyForm.admin_remarks}
                                            onChange={(e) => setVerifyForm({...verifyForm, admin_remarks: e.target.value})}
                                            rows="3"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="Enter verification remarks..."
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setShowVerifyModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={verifyAttendance}
                                        disabled={verifyLoading[selectedAttendance.attendance_id]}
                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {verifyLoading[selectedAttendance.attendance_id] ? (
                                            <>
                                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <FiCheck className="w-4 h-4" />
                                                Verify
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bulk Verify Modal with Conditional OT/Fine Options */}
            <AnimatePresence>
                {showBulkVerifyModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowBulkVerifyModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">Bulk Verify Attendance</h3>
                                        <p className="text-indigo-100 text-sm mt-1">
                                            Based on actual punch times and salary settings
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowBulkVerifyModal(false)}
                                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                                    >
                                        <FiXCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                        <p className="text-xs text-blue-600">Total Selected</p>
                                        <p className="text-lg font-bold text-blue-700">{bulkVerifyData.length}</p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                        <p className="text-xs text-green-600">Will be Present</p>
                                        <p className="text-lg font-bold text-green-700">
                                            {bulkVerifyData.filter(d => d.actual_status === 'present').length}
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                        <p className="text-xs text-purple-600">Will be Bonus</p>
                                        <p className="text-lg font-bold text-purple-700">
                                            {bulkVerifyData.filter(d => d.actual_status === 'bonus').length}
                                        </p>
                                        <p className="text-xs text-purple-500 mt-1">
                                            (Only for OT enabled staff)
                                        </p>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                        <p className="text-xs text-orange-600">Will be Fine</p>
                                        <p className="text-lg font-bold text-orange-700">
                                            {bulkVerifyData.filter(d => d.actual_status === 'fine').length}
                                        </p>
                                        <p className="text-xs text-orange-500 mt-1">
                                            (Only for Fine enabled staff)
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Override Status (Optional)
                                    </label>
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    >
                                        <option value="">Auto-calculate from actual time</option>
                                        <option value="present">Present</option>
                                        <option value="half_day">Half Day</option>
                                        <option value="absent">Absent</option>
                                        <option value="paid_leave">Paid Leave</option>
                                        {bulkVerifyData.some(d => d.feature_status?.overtime?.enabled) && (
                                            <option value="bonus">Bonus (Extra Hours)</option>
                                        )}
                                        {bulkVerifyData.some(d => d.feature_status?.fine?.enabled) && (
                                            <option value="fine">Fine (Less Hours)</option>
                                        )}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">
                                        * If not selected, status will be auto-calculated based on actual punch times and salary settings
                                    </p>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Common Remarks (Optional)
                                    </label>
                                    <textarea
                                        value={commonRemarks}
                                        onChange={(e) => setCommonRemarks(e.target.value)}
                                        rows="2"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        placeholder="Add common remarks for all selected records..."
                                    />
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <FiList className="w-4 h-4 text-indigo-600" />
                                        Selected Staff with Actual Time Calculation
                                    </h4>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr className="border-b border-gray-200">
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Staff</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Duty Time</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Punch In</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Punch Out</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Total Hours</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actual Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Features</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {bulkVerifyData.map((staff, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{staff.name}</p>
                                                                <p className="text-xs text-gray-500">{staff.designation}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {staff.duty_time?.schedule || '09:00 to 18:00'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {staff.in_time !== '00:00' ? formatTimeDisplay(staff.in_time) : 'Not Marked'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {staff.out_time !== '00:00' ? formatTimeDisplay(staff.out_time) : 'Not Marked'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="font-semibold text-gray-900">
                                                                {staff.total_hours} hrs
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                                staff.actual_status === 'present' ? 'bg-green-100 text-green-700' :
                                                                staff.actual_status === 'bonus' ? 'bg-purple-100 text-purple-700' :
                                                                staff.actual_status === 'fine' ? 'bg-orange-100 text-orange-700' :
                                                                staff.actual_status === 'absent' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {staff.actual_status === 'bonus' && <FiAward className="w-3 h-3" />}
                                                                {staff.actual_status === 'fine' && <FiMinusCircle className="w-3 h-3" />}
                                                                {getStatusDisplay(staff.actual_status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex gap-1">
                                                                {staff.feature_status?.overtime?.enabled ? (
                                                                    <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">OT ✓</span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">OT ✗</span>
                                                                )}
                                                                {staff.feature_status?.fine?.enabled ? (
                                                                    <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Fine ✓</span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Fine ✗</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowBulkVerifyModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkVerify}
                                        disabled={bulkVerifyLoading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {bulkVerifyLoading ? (
                                            <>
                                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <FiCheck className="w-4 h-4" />
                                                Verify {bulkVerifyData.length} Records
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSalaryModal && salaryData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowSalaryModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">Salary Calculation</h3>
                                        <p className="text-blue-100 text-sm mt-1">
                                            {salaryData.staff_info?.name} • {salaryData.staff_info?.designation}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowSalaryModal(false)}
                                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                                    >
                                        <FiXCircle className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <div className="mt-4 flex gap-3">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => {
                                            setSelectedMonth(parseInt(e.target.value));
                                            fetchSalaryCalculation(selectedStaffForSalary.username, parseInt(e.target.value), selectedYear);
                                        }}
                                        className="px-3 py-1.5 text-sm rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none cursor-pointer"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                            <option key={month} value={month} className="text-gray-900">
                                                {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => {
                                            setSelectedYear(parseInt(e.target.value));
                                            fetchSalaryCalculation(selectedStaffForSalary.username, selectedMonth, parseInt(e.target.value));
                                        }}
                                        className="px-3 py-1.5 text-sm rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none cursor-pointer"
                                    >
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {salaryLoading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Loading salary data...</p>
                                </div>
                            ) : (
                                <div className="p-6">
                                    <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <FiCalendar className="w-4 h-4 text-blue-600" />
                                            Salary Period
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs">Month</p>
                                                <p className="font-semibold text-gray-800">{salaryData.period?.month_name} {salaryData.period?.year}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Start Date</p>
                                                <p className="font-semibold text-gray-800">{salaryData.period?.start_date ? new Date(salaryData.period.start_date).toLocaleDateString() : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">End Date</p>
                                                <p className="font-semibold text-gray-800">{salaryData.period?.end_date ? new Date(salaryData.period.end_date).toLocaleDateString() : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Total Days</p>
                                                <p className="font-semibold text-gray-800">{salaryData.period?.total_days || 0} days</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <div className="border-b border-gray-200">
                                            <nav className="flex gap-4">
                                                <button
                                                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                                                        activeTab === 'full' 
                                                            ? 'text-blue-600 border-b-2 border-blue-600' 
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                    onClick={() => setActiveTab('full')}
                                                >
                                                    Full Month Summary
                                                </button>
                                                <button
                                                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                                                        activeTab === 'tilldate' 
                                                            ? 'text-blue-600 border-b-2 border-blue-600' 
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                    onClick={() => setActiveTab('tilldate')}
                                                >
                                                    Till Date Summary
                                                    {salaryData.till_date_summary?.calculated_upto?.is_current_month && (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                            Live
                                                        </span>
                                                    )}
                                                </button>
                                            </nav>
                                        </div>
                                    </div>

                                    {activeTab === 'full' && (
                                        <>
                                            <div className="mb-6">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Attendance Summary</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                        <p className="text-xs text-green-600">Present</p>
                                                        <p className="text-lg font-bold text-green-700">{salaryData.monthly_summary?.attendance_summary?.present || salaryData.attendance_summary?.present || 0}</p>
                                                    </div>
                                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                                        <p className="text-xs text-purple-600">Bonus</p>
                                                        <p className="text-lg font-bold text-purple-700">{salaryData.monthly_summary?.attendance_summary?.bonus || salaryData.attendance_summary?.bonus || 0}</p>
                                                    </div>
                                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                                        <p className="text-xs text-orange-600">Fine</p>
                                                        <p className="text-lg font-bold text-orange-700">{salaryData.monthly_summary?.attendance_summary?.fine || salaryData.attendance_summary?.fine || 0}</p>
                                                    </div>
                                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                                        <p className="text-xs text-yellow-600">Half Day</p>
                                                        <p className="text-lg font-bold text-yellow-700">{salaryData.monthly_summary?.attendance_summary?.half_day || salaryData.attendance_summary?.half_day || 0}</p>
                                                    </div>
                                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                        <p className="text-xs text-blue-600">Paid Leave</p>
                                                        <p className="text-lg font-bold text-blue-700">{salaryData.monthly_summary?.attendance_summary?.paid_leave || salaryData.attendance_summary?.paid_leave || 0}</p>
                                                    </div>
                                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                                        <p className="text-xs text-red-600">Absent</p>
                                                        <p className="text-lg font-bold text-red-700">{salaryData.monthly_summary?.attendance_summary?.absent || salaryData.attendance_summary?.absent || 0}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                    <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                                            <FiTrendingUp className="w-3 h-3" />
                                                            Extra Time
                                                        </p>
                                                        <p className="text-sm font-semibold text-green-700">
                                                            {salaryData.monthly_summary?.attendance_summary?.extra_time?.formatted || salaryData.attendance_summary?.extra_time?.formatted || '0h 0m'} 
                                                            <span className="text-xs ml-1">
                                                                (+{formatCurrency(Math.abs(salaryData.monthly_summary?.salary_calculation?.bonus_adjustment || salaryData.salary_calculation?.bonus_adjustment || 0))})
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-orange-50 p-2 rounded-lg border border-orange-200">
                                                        <p className="text-xs text-orange-600 flex items-center gap-1">
                                                            <FiTrendingDown className="w-3 h-3" />
                                                            Less Time
                                                        </p>
                                                        <p className="text-sm font-semibold text-orange-700">
                                                            {salaryData.monthly_summary?.attendance_summary?.less_time?.formatted || salaryData.attendance_summary?.less_time?.formatted || '0h 0m'}
                                                            <span className="text-xs ml-1">
                                                                (-{formatCurrency(Math.abs(salaryData.monthly_summary?.salary_calculation?.fine_adjustment || salaryData.salary_calculation?.fine_adjustment || 0))})
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Salary Breakdown</h4>
                                                <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                                    <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200">
                                                        <div className="p-4">
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600">Monthly Salary</span>
                                                                    <span className="font-semibold">{formatCurrency(salaryData.salary_configuration?.monthly_salary || 0)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600">Per Day Salary</span>
                                                                    <span className="font-semibold">{formatCurrency(parseFloat(salaryData.salary_configuration?.per_day_salary) || 0)}</span>
                                                                </div>
                                                                <div className="border-t border-gray-200 pt-2">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-gray-600">Present Days</span>
                                                                        <span className="font-semibold">{salaryData.monthly_summary?.attendance_summary?.present || salaryData.attendance_summary?.present || 0}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-gray-600">Present Amount</span>
                                                                        <span className="font-semibold">{formatCurrency(parseFloat(salaryData.monthly_summary?.salary_calculation?.formula?.present_amount || salaryData.salary_calculation?.formula?.present_amount || 0))}</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-gray-600">Paid Leave Days</span>
                                                                        <span className="font-semibold">{salaryData.monthly_summary?.attendance_summary?.paid_leave || salaryData.attendance_summary?.paid_leave || 0}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-gray-600">Paid Leave Amount</span>
                                                                        <span className="font-semibold">{formatCurrency(parseFloat(salaryData.monthly_summary?.salary_calculation?.formula?.paid_leave_amount || salaryData.salary_calculation?.formula?.paid_leave_amount || 0))}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-4">
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between text-sm text-green-600">
                                                                    <span className="flex items-center gap-1">
                                                                        <FiAward className="w-3 h-3" />
                                                                        Bonus Amount
                                                                    </span>
                                                                    <span>+{formatCurrency(Math.abs(parseFloat(salaryData.monthly_summary?.salary_calculation?.bonus_adjustment || salaryData.salary_calculation?.bonus_adjustment || 0)))}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm text-orange-600">
                                                                    <span className="flex items-center gap-1">
                                                                        <FiMinusCircle className="w-3 h-3" />
                                                                        Fine Amount
                                                                    </span>
                                                                    <span>-{formatCurrency(Math.abs(parseFloat(salaryData.monthly_summary?.salary_calculation?.fine_adjustment || salaryData.salary_calculation?.fine_adjustment || 0)))}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm text-yellow-600">
                                                                    <span>Half Day Days</span>
                                                                    <span>{salaryData.monthly_summary?.attendance_summary?.half_day || salaryData.attendance_summary?.half_day || 0}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm text-yellow-600">
                                                                    <span>Half Day Deduction</span>
                                                                    <span>-{formatCurrency(Math.abs(parseFloat(salaryData.monthly_summary?.salary_calculation?.half_day_adjustment || salaryData.salary_calculation?.half_day_adjustment || 0)))}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-gray-600">Base Salary Earned</p>
                                                        <p className="text-lg font-bold text-gray-900">{formatCurrency(parseFloat(salaryData.monthly_summary?.salary_calculation?.base_salary_earned || salaryData.salary_calculation?.base_salary_earned || 0))}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600">Adjustments</p>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-green-600">+ Bonus</span>
                                                            <span>{formatCurrency(Math.abs(parseFloat(salaryData.monthly_summary?.salary_calculation?.bonus_adjustment || salaryData.salary_calculation?.bonus_adjustment || 0)))}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-orange-600">- Fine</span>
                                                            <span>{formatCurrency(Math.abs(parseFloat(salaryData.monthly_summary?.salary_calculation?.fine_adjustment || salaryData.salary_calculation?.fine_adjustment || 0)))}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-yellow-600">- Half Day</span>
                                                            <span>{formatCurrency(Math.abs(parseFloat(salaryData.monthly_summary?.salary_calculation?.half_day_adjustment || salaryData.salary_calculation?.half_day_adjustment || 0)))}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-blue-200">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-gray-800">Total Salary for {salaryData.period?.month_name} {salaryData.period?.year}</span>
                                                        <span className="text-2xl font-bold text-blue-600">{formatCurrency(parseFloat(salaryData.monthly_summary?.salary_calculation?.total_earned || salaryData.salary_calculation?.total_earned || 0))}</span>
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-500">
                                                        {salaryData.monthly_summary?.salary_calculation?.salary_message || salaryData.salary_calculation?.salary_message}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 'tilldate' && salaryData.till_date_summary && (
                                        <>
                                            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                                                            <FiClock className="w-4 h-4" />
                                                            Salary Calculated Till Date
                                                        </h4>
                                                        <p className="text-xs text-green-600 mt-1">
                                                            {salaryData.till_date_summary.calculated_upto?.is_current_month ? 
                                                                `Up to ${new Date().toLocaleDateString()} (Current Month - Live Data)` : 
                                                                `Up to ${salaryData.till_date_summary.calculated_upto?.date ? new Date(salaryData.till_date_summary.calculated_upto.date).toLocaleDateString() : '-'}`}
                                                        </p>
                                                    </div>
                                                    {salaryData.till_date_summary.calculated_upto?.is_current_month && (
                                                        <div className="px-3 py-1 bg-green-600 text-white text-xs rounded-full font-semibold">
                                                            Live Update
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Attendance Summary (Till Date)</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                        <p className="text-xs text-green-600">Present</p>
                                                        <p className="text-lg font-bold text-green-700">{salaryData.till_date_summary.attendance_summary?.present || 0}</p>
                                                    </div>
                                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                                        <p className="text-xs text-purple-600">Bonus</p>
                                                        <p className="text-lg font-bold text-purple-700">{salaryData.till_date_summary.attendance_summary?.bonus || 0}</p>
                                                    </div>
                                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                                        <p className="text-xs text-orange-600">Fine</p>
                                                        <p className="text-lg font-bold text-orange-700">{salaryData.till_date_summary.attendance_summary?.fine || 0}</p>
                                                    </div>
                                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                                        <p className="text-xs text-yellow-600">Half Day</p>
                                                        <p className="text-lg font-bold text-yellow-700">{salaryData.till_date_summary.attendance_summary?.half_day || 0}</p>
                                                    </div>
                                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                        <p className="text-xs text-blue-600">Paid Leave</p>
                                                        <p className="text-lg font-bold text-blue-700">{salaryData.till_date_summary.attendance_summary?.paid_leave || 0}</p>
                                                    </div>
                                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                                        <p className="text-xs text-red-600">Absent</p>
                                                        <p className="text-lg font-bold text-red-700">{salaryData.till_date_summary.attendance_summary?.absent || 0}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                        <p className="text-xs text-blue-600">Working Days Till Date</p>
                                                        <p className="text-lg font-bold text-blue-700">{salaryData.till_date_summary.attendance_summary?.total_days_worked || 0} / {(salaryData.till_date_summary.attendance_summary?.total_days_worked || 0) + (salaryData.till_date_summary.attendance_summary?.absent || 0)}</p>
                                                        <p className="text-xs text-blue-500 mt-1">Attendance: {salaryData.till_date_summary.attendance_summary?.attendance_percentage || 0}%</p>
                                                    </div>
                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                        <p className="text-xs text-gray-600">Weekly Off</p>
                                                        <p className="text-lg font-bold text-gray-700">{salaryData.till_date_summary.attendance_summary?.weekly_off || 0}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                    <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                                            <FiTrendingUp className="w-3 h-3" />
                                                            Extra Time (Till Date)
                                                        </p>
                                                        <p className="text-sm font-semibold text-green-700">
                                                            {salaryData.till_date_summary.attendance_summary?.extra_time?.formatted || '0h 0m'} 
                                                            <span className="text-xs ml-1">(+{formatCurrency(Math.abs(salaryData.till_date_summary.salary_calculation?.bonus_adjustment || 0))})</span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-orange-50 p-2 rounded-lg border border-orange-200">
                                                        <p className="text-xs text-orange-600 flex items-center gap-1">
                                                            <FiTrendingDown className="w-3 h-3" />
                                                            Less Time (Till Date)
                                                        </p>
                                                        <p className="text-sm font-semibold text-orange-700">
                                                            {salaryData.till_date_summary.attendance_summary?.less_time?.formatted || '0h 0m'}
                                                            <span className="text-xs ml-1">(-{formatCurrency(Math.abs(salaryData.till_date_summary.salary_calculation?.fine_adjustment || 0))})</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Salary Calculation (Till Date)</h4>
                                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg overflow-hidden border border-gray-200">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                                                <span className="text-gray-600 text-sm">Expected Salary (Pro-rated)</span>
                                                                <span className="font-bold text-gray-800">{formatCurrency(parseFloat(salaryData.till_date_summary.salary_calculation?.expected_salary_till_date || 0))}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-600 text-sm">Actual Earned</span>
                                                                <span className="font-bold text-green-600">{formatCurrency(parseFloat(salaryData.till_date_summary.salary_calculation?.actual_earned_till_date || 0))}</span>
                                                            </div>
                                                            <div className={`flex justify-between items-center p-2 rounded-lg ${parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0) >= 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
                                                                <span className={`text-sm ${parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0) >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                                                                    {parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0) >= 0 ? 'Extra Earned' : 'Shortfall'}
                                                                </span>
                                                                <span className={`font-bold ${parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0) >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                                                                    {parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0) >= 0 ? '+' : ''}{formatCurrency(Math.abs(parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0)))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-gray-600">Base Salary (Worked Days)</span>
                                                                <span className="font-semibold">{formatCurrency(parseFloat(salaryData.till_date_summary.salary_calculation?.base_salary_earned || 0))}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm text-green-600">
                                                                <span>+ Bonus Adjustment</span>
                                                                <span>{formatCurrency(Math.abs(parseFloat(salaryData.till_date_summary.salary_calculation?.bonus_adjustment || 0)))}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm text-orange-600">
                                                                <span>- Fine Adjustment</span>
                                                                <span>{formatCurrency(Math.abs(parseFloat(salaryData.till_date_summary.salary_calculation?.fine_adjustment || 0)))}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm text-yellow-600">
                                                                <span>- Half Day Adjustment</span>
                                                                <span>{formatCurrency(Math.abs(parseFloat(salaryData.till_date_summary.salary_calculation?.half_day_adjustment || 0)))}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {salaryData.till_date_summary.projection && (
                                                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                                                    <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                                                        <FiTrendingUp className="w-4 h-4" />
                                                        Month End Projection
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="text-center p-3 bg-white rounded-lg">
                                                            <p className="text-xs text-gray-500">Estimated Month End Salary</p>
                                                            <p className="text-xl font-bold text-purple-700">{formatCurrency(parseFloat(salaryData.till_date_summary.projection?.estimated_month_end_salary || 0))}</p>
                                                        </div>
                                                        <div className="text-center p-3 bg-white rounded-lg">
                                                            <p className="text-xs text-gray-500">Projected Extra Hours</p>
                                                            <p className="text-xl font-bold text-green-600">{salaryData.till_date_summary.projection?.estimated_extra_hours || 0} mins</p>
                                                        </div>
                                                        <div className="text-center p-3 bg-white rounded-lg">
                                                            <p className="text-xs text-gray-500">Projected Less Hours</p>
                                                            <p className="text-xl font-bold text-orange-600">{salaryData.till_date_summary.projection?.estimated_less_hours || 0} mins</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-purple-600 mt-3 text-center">
                                                        {salaryData.till_date_summary.projection?.note || ''}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <p className="text-sm text-blue-800 flex items-center gap-2">
                                                    <FiInfo className="w-4 h-4" />
                                                    {salaryData.till_date_summary.salary_calculation?.salary_message || ''}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 hover:text-blue-600 transition-colors">
                                            <FiCalendar className="w-4 h-4" />
                                            Day-wise Breakdown ({salaryData.day_wise_breakdown?.length || 0} days)
                                            <span className="text-xs text-gray-400 ml-2">(Click to expand)</span>
                                        </summary>
                                        <div className="mt-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr className="border-b border-gray-200">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Day</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {salaryData.day_wise_breakdown?.map((day, index) => (
                                                        <tr key={index} className={`hover:bg-gray-50 transition-colors ${day.is_till_date ? 'bg-blue-50/30' : ''}`}>
                                                            <td className="px-4 py-2 text-sm text-gray-700">
                                                                {day.date ? new Date(day.date).toLocaleDateString() : '-'}
                                                                {day.is_till_date && (
                                                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">Live</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-gray-600">{day.day_of_week || '-'}</td>
                                                            <td className="px-4 py-2">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(day.status)}`}>
                                                                    {getStatusIcon(day.status)}
                                                                    {day.status_display || getStatusDisplay(day.status)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-medium text-gray-700">
                                                                {day.calculated_amount > 0 ? formatCurrency(day.calculated_amount) : '-'}
                                                            </td>
                                                            <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">
                                                                {day.remarks || (day.extra_minutes > 0 ? `${day.extra_hours}h extra` : day.less_minutes > 0 ? `${day.less_hours}h less` : '-')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </details>

                                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div>
                                                <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                                                    <FiAlertTriangle className="w-3 h-3" />
                                                    Verification Status
                                                </p>
                                                <p className="text-sm text-yellow-700">{salaryData.verification_status?.pending_verification_days || 0} day(s) pending verification</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-yellow-800">Can be paid: {salaryData.verification_status?.can_be_paid ? 'Yes ✓' : 'No ✗'}</p>
                                                <p className="text-xs text-yellow-800">Verified: {salaryData.verification_status?.verified_days || 0}/{salaryData.period?.total_days || 0} days</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageAttendance;