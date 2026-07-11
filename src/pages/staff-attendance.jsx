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
    FiMail,
    FiCoffee,
    FiChevronDown
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
    const [applyTravelAllowance, setApplyTravelAllowance] = useState(true);
    const [applyOtherDeductions, setApplyOtherDeductions] = useState(true);
    const [considerBreakBulk, setConsiderBreakBulk] = useState(true);

    // Modal state for manual verification
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [verifyForm, setVerifyForm] = useState({
        verify_status: 'present',
        manual_punch_in: '',
        manual_punch_out: '',
        admin_remarks: '',
        isManual: false,
        consider_break: true,
        apply_travel_allowance: true,
        apply_other_deductions: true,
        create_if_missing: false
    });
    const [calculationPreview, setCalculationPreview] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Staff Detail Modal
    const [showStaffDetailModal, setShowStaffDetailModal] = useState(false);
    const [selectedStaffDetail, setSelectedStaffDetail] = useState(null);

    // Modal state for salary calculation
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [salaryData, setSalaryData] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [salaryLoading, setSalaryLoading] = useState(false);
    const [selectedStaffForSalary, setSelectedStaffForSalary] = useState(null);
    const [activeTab, setActiveTab] = useState('full');

    // Departments for filter
    const [departments, setDepartments] = useState(['All Departments']);
    
    // Dropdown menu state
    const [openMenuId, setOpenMenuId] = useState(null);

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
    const getStatusBadge = (status, isVerified) => {
        const baseClasses = "px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 inline-flex items-center gap-1";
        
        if (isVerified) {
            switch (status?.code || status) {
                case 'present':
                    return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
                case 'half_day':
                case 'half day':
                    return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
                case 'absent':
                    return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
                case 'paid_leave':
                case 'paid leave':
                    return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
                case 'bonus':
                    return `${baseClasses} bg-purple-100 text-purple-800 border border-purple-200`;
                case 'fine':
                    return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-200`;
                case 'pending':
                    return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
                case 'weekly_off':
                    return `${baseClasses} bg-indigo-100 text-indigo-800 border border-indigo-200`;
                default:
                    return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
            }
        } else {
            return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
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

    // Get available status options based on feature status and punch times
    const getAvailableStatusOptions = (featureStatus, currentStatus, totalMinutes, expectedMinutes, isVerified) => {
        const options = [
            { value: 'present', label: 'Present', selected: currentStatus === 'present', enabled: true }
        ];
        
        // Check if employee actually worked overtime (has extra minutes)
        const hasExtraMinutes = totalMinutes > expectedMinutes;
        const hasLessMinutes = totalMinutes < expectedMinutes && totalMinutes > 0;
        
        // OT/Bonus option - only if enabled AND employee worked extra
        if (featureStatus?.overtime?.enabled && hasExtraMinutes) {
            options.push({ 
                value: 'bonus', 
                label: 'Bonus (OT)', 
                selected: currentStatus === 'bonus',
                enabled: true
            });
        } else if (featureStatus?.overtime?.enabled && !hasExtraMinutes) {
            options.push({ 
                value: 'bonus', 
                label: 'Bonus (OT)', 
                selected: false,
                enabled: false,
                disabled_reason: 'No overtime hours worked'
            });
        } else if (!featureStatus?.overtime?.enabled) {
            options.push({ 
                value: 'bonus', 
                label: 'Bonus (OT)', 
                selected: false,
                enabled: false,
                disabled_reason: 'Overtime not enabled'
            });
        }
        
        options.push({ 
            value: 'half_day', 
            label: 'Half Day', 
            selected: currentStatus === 'half_day',
            enabled: true
        });
        options.push({ 
            value: 'paid_leave', 
            label: 'Paid Leave', 
            selected: currentStatus === 'paid_leave',
            enabled: true
        });
        options.push({ 
            value: 'absent', 
            label: 'Absent', 
            selected: currentStatus === 'absent',
            enabled: true
        });
        
        // Fine option - only if enabled AND employee worked less
        if (featureStatus?.fine?.enabled && hasLessMinutes && !isVerified) {
            options.push({ 
                value: 'fine', 
                label: 'Fine', 
                selected: currentStatus === 'fine',
                enabled: true
            });
        } else if (featureStatus?.fine?.enabled && !hasLessMinutes) {
            options.push({ 
                value: 'fine', 
                label: 'Fine', 
                selected: false,
                enabled: false,
                disabled_reason: 'No less hours worked'
            });
        } else if (!featureStatus?.fine?.enabled) {
            options.push({ 
                value: 'fine', 
                label: 'Fine', 
                selected: false,
                enabled: false,
                disabled_reason: 'Fine not enabled'
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
                const expectedMinutes = (staff) => (staff.duty_time?.expected_hours || 8) * 60;
                
                const presentStaff = result.data.attendance.map(item => ({
                    attendance_id: item.attendance_id,
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
                    status: item.status,
                    feature_status: item.feature_status,
                    in_time: item.punch_details?.punch_in?.time || '00:00',
                    out_time: item.punch_details?.punch_out?.time || '00:00',
                    in_datetime: item.punch_details?.punch_in?.datetime,
                    out_datetime: item.punch_details?.punch_out?.datetime,
                    punch_in_status: item.punch_details?.punch_in?.status,
                    punch_out_status: item.punch_details?.punch_out?.status,
                    working_hours: item.working_hours,
                    total_minutes: item.working_hours?.total_minutes || 0,
                    expected_minutes: (item.duty_time?.expected?.hours || 8) * 60,
                    is_verified: item.status.is_verified || false,
                    is_manual: item.is_manual,
                    manual_reason: item.manual_reason,
                    salary: item.salary,
                    break_summary: item.break_summary,
                    adjustments: item.adjustments,
                    available_options: getAvailableStatusOptions(
                        item.feature_status, 
                        item.status.code,
                        item.working_hours?.total_minutes || 0,
                        (item.duty_time?.expected?.hours || 8) * 60,
                        item.status.is_verified || false
                    )
                }));

                const absentStaffData = result.data.absent_staff.map(item => ({
                    attendance_id: null,
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
                    status: { code: 'absent', display: 'Absent', is_verified: false },
                    feature_status: item.feature_status,
                    in_time: '00:00',
                    out_time: '00:00',
                    total_minutes: 0,
                    expected_minutes: (item.duty_time?.expected?.hours || 8) * 60,
                    is_verified: false,
                    salary: item.salary,
                    break_summary: null,
                    adjustments: null,
                    available_options: getAvailableStatusOptions(
                        item.feature_status, 
                        'absent',
                        0,
                        (item.duty_time?.expected?.hours || 8) * 60,
                        false
                    )
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

    // Open staff detail modal
    const openStaffDetailModal = (staff) => {
        setSelectedStaffDetail(staff);
        setShowStaffDetailModal(true);
    };

    // Create and verify attendance for missing punch-in
    const createAndVerifyAttendance = async (staff, status, customTimes = null) => {
        setVerifyLoading(prev => ({ ...prev, [staff.attendance_id || staff.username]: true }));
        
        try {
            const payload = {
                username: staff.username,
                attendance_date: formatDateForAPI(selectedDate),
                verify_status: status,
                admin_remarks: `Manual entry - ${status}`,
                consider_break: true,
                apply_travel_allowance: true,
                apply_other_deductions: true,
                create_if_missing: true
            };

            if (customTimes) {
                payload.manual_punch_in = customTimes.punch_in;
                payload.manual_punch_out = customTimes.punch_out;
            }

            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/verify-v2`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                }
            );

            const result = await response.json();
            
            if (response.ok && result.success) {
                toast.success(`✅ Attendance marked as ${status} for ${staff.name}`);
                await fetchAttendanceData();
            } else {
                toast.error(result.message || 'Failed to create attendance');
            }
        } catch (error) {
            console.error('Error creating attendance:', error);
            toast.error('Failed to create attendance');
        } finally {
            setVerifyLoading(prev => ({ ...prev, [staff.attendance_id || staff.username]: false }));
        }
    };

    // Verify attendance using V2 API
    const verifyAttendance = async () => {
        if (!selectedAttendance) return;

        setVerifyLoading(prev => ({ ...prev, [selectedAttendance.attendance_id]: true }));
        
        try {
            const payload = {
                attendance_id: selectedAttendance.attendance_id,
                verify_status: verifyForm.verify_status,
                admin_remarks: verifyForm.admin_remarks || `Verified as ${verifyForm.verify_status}`,
                consider_break: verifyForm.consider_break,
                apply_travel_allowance: verifyForm.apply_travel_allowance,
                apply_other_deductions: verifyForm.apply_other_deductions
            };

            if (verifyForm.manual_punch_in) {
                const dateStr = formatDateForAPI(selectedDate);
                const punchInTime = new Date(`${dateStr}T${verifyForm.manual_punch_in}`);
                if (!isNaN(punchInTime.getTime())) {
                    payload.manual_punch_in = punchInTime.toISOString().slice(0, 19).replace('T', ' ');
                }
            }
            if (verifyForm.manual_punch_out) {
                const dateStr = formatDateForAPI(selectedDate);
                const punchOutTime = new Date(`${dateStr}T${verifyForm.manual_punch_out}`);
                if (!isNaN(punchOutTime.getTime())) {
                    payload.manual_punch_out = punchOutTime.toISOString().slice(0, 19).replace('T', ' ');
                }
            }

            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/verify-v2`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                }
            );

            const result = await response.json();
            
            if (response.ok && result.success) {
                toast.success(`✅ Verified: ${result.data.status}\n💰 Amount: ${formatCurrency(result.data.salary_breakdown?.final_amount || 0)}`);
                
                setShowVerifyModal(false);
                setSelectedAttendance(null);
                setVerifyForm({
                    verify_status: 'present',
                    manual_punch_in: '',
                    manual_punch_out: '',
                    admin_remarks: '',
                    isManual: false,
                    consider_break: true,
                    apply_travel_allowance: true,
                    apply_other_deductions: true,
                    create_if_missing: false
                });
                setCalculationPreview(null);
                await fetchAttendanceData();
            } else {
                toast.error(result.message || 'Failed to verify attendance');
            }
        } catch (error) {
            console.error('Error verifying attendance:', error);
            toast.error('Failed to verify attendance');
        } finally {
            setVerifyLoading(prev => ({ ...prev, [selectedAttendance.attendance_id]: false }));
        }
    };

    // Preview calculation before verification
    const previewCalculation = async () => {
        if (!selectedAttendance) return;
        
        setIsPreviewLoading(true);
        try {
            const payload = {
                attendance_id: selectedAttendance.attendance_id,
                verify_status: verifyForm.verify_status,
                admin_remarks: verifyForm.admin_remarks || `Preview calculation`,
                consider_break: verifyForm.consider_break,
                apply_travel_allowance: verifyForm.apply_travel_allowance,
                apply_other_deductions: verifyForm.apply_other_deductions
            };

            if (verifyForm.manual_punch_in) {
                const dateStr = formatDateForAPI(selectedDate);
                const punchInTime = new Date(`${dateStr}T${verifyForm.manual_punch_in}`);
                if (!isNaN(punchInTime.getTime())) {
                    payload.manual_punch_in = punchInTime.toISOString().slice(0, 19).replace('T', ' ');
                }
            }
            if (verifyForm.manual_punch_out) {
                const dateStr = formatDateForAPI(selectedDate);
                const punchOutTime = new Date(`${dateStr}T${verifyForm.manual_punch_out}`);
                if (!isNaN(punchOutTime.getTime())) {
                    payload.manual_punch_out = punchOutTime.toISOString().slice(0, 19).replace('T', ' ');
                }
            }

            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/verify-v2`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                }
            );

            const result = await response.json();
            
            if (response.ok && result.success) {
                setCalculationPreview(result.data);
                toast.success('Calculation preview ready');
            } else {
                toast.error(result.message || 'Failed to preview calculation');
            }
        } catch (error) {
            console.error('Error previewing calculation:', error);
            toast.error('Failed to preview calculation');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // Open verify modal
    const openVerifyModal = (attendance) => {
        // Format existing punch times for editing
        let existingPunchIn = '';
        let existingPunchOut = '';
        
        if (attendance.in_datetime) {
            const date = new Date(attendance.in_datetime);
            existingPunchIn = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        } else if (attendance.in_time && attendance.in_time !== '00:00') {
            existingPunchIn = attendance.in_time.substring(0, 5);
        }
        
        if (attendance.out_datetime) {
            const date = new Date(attendance.out_datetime);
            existingPunchOut = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        } else if (attendance.out_time && attendance.out_time !== '00:00') {
            existingPunchOut = attendance.out_time.substring(0, 5);
        }
        
        setSelectedAttendance(attendance);
        setVerifyForm({
            verify_status: attendance.status?.code || 'present',
            manual_punch_in: existingPunchIn,
            manual_punch_out: existingPunchOut,
            admin_remarks: attendance.status?.remarks || '',
            isManual: false,
            consider_break: true,
            apply_travel_allowance: true,
            apply_other_deductions: true,
            create_if_missing: false
        });
        setCalculationPreview(null);
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
        
        const bulkData = selectedStaffList.map(staff => {
            let actualStatus = 'pending';
            let extraMinutes = 0;
            let lessMinutes = 0;
            let totalMinutes = staff.total_minutes || 0;
            
            const expectedMinutes = staff.expected_minutes || 480;
            
            if (totalMinutes > expectedMinutes && staff.feature_status?.overtime?.enabled) {
                actualStatus = 'bonus';
                extraMinutes = totalMinutes - expectedMinutes;
            } else if (totalMinutes < expectedMinutes && totalMinutes > 0 && staff.feature_status?.fine?.enabled && !staff.is_verified) {
                actualStatus = 'fine';
                lessMinutes = expectedMinutes - totalMinutes;
            } else if (totalMinutes === 0) {
                actualStatus = 'absent';
            } else if (totalMinutes > 0) {
                actualStatus = 'present';
            } else {
                actualStatus = 'pending';
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
                feature_status: staff.feature_status,
                is_verified: staff.is_verified
            };
        });
        
        setBulkVerifyData(bulkData);
        setSelectedStatus('');
        setCommonRemarks('');
        setApplyTravelAllowance(true);
        setApplyOtherDeductions(true);
        setConsiderBreakBulk(true);
        setShowBulkVerifyModal(true);
    };

    // Handle Bulk Verification using V2 API
    const handleBulkVerify = async () => {
        setBulkVerifyLoading(true);
        
        try {
            const selectedIds = Array.from(selectedStaff);
            const attendanceIds = selectedIds.filter(id => id && !id.startsWith('absent-'));
            
            if (attendanceIds.length === 0) {
                toast.error('No valid attendance records selected');
                setBulkVerifyLoading(false);
                return;
            }
            
            let successCount = 0;
            let failCount = 0;
            
            for (const attendanceId of attendanceIds) {
                try {
                    const payload = {
                        attendance_id: attendanceId,
                        ...(selectedStatus && { verify_status: selectedStatus }),
                        admin_remarks: commonRemarks || `Bulk verified`,
                        consider_break: considerBreakBulk,
                        apply_travel_allowance: applyTravelAllowance,
                        apply_other_deductions: applyOtherDeductions
                    };
                    
                    const response = await fetch(
                        `${API_BASE_URL}/attendance/admin/verify-v2`,
                        {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify(payload)
                        }
                    );
                    
                    const result = await response.json();
                    if (response.ok && result.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (err) {
                    failCount++;
                    console.error(`Error verifying ${attendanceId}:`, err);
                }
            }
            
            if (successCount > 0) {
                toast.success(`Bulk verification completed: ${successCount} verified, ${failCount} failed`);
                setShowBulkVerifyModal(false);
                setSelectedStaff(new Set());
                await fetchAttendanceData();
            } else {
                toast.error('Bulk verification failed');
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
        if (!staffId) return;
        const newSelected = new Set(selectedStaff);
        if (newSelected.has(staffId)) {
            newSelected.delete(staffId);
        } else {
            newSelected.add(staffId);
        }
        setSelectedStaff(newSelected);
    };

    const selectAllStaff = () => {
        const allStaff = [...attendanceData, ...absentStaff].filter(s => s.attendance_id);
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
                    (staff.name || '').toLowerCase().includes(query) ||
                    (staff.mobile || '').includes(query) ||
                    (staff.designation || '').toLowerCase().includes(query)
                );
            }
            
            return true;
        });
    };

    const filteredData = getFilteredData();
    const selectableStaff = filteredData.filter(s => s.attendance_id);
    const allSelected = selectedStaff.size === selectableStaff.length && selectableStaff.length > 0;

    // Toggle dropdown menu
    const toggleMenu = (id) => {
        setOpenMenuId(openMenuId === id ? null : id);
    };

    // Skeleton Loader
    const TableSkeleton = () => (
        <>
            {Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="border-b border-gray-200 animate-pulse">
                    <td className="px-4 py-3">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
                            <div className="space-y-1">
                                <div className="h-3 bg-gray-200 rounded w-28"></div>
                                <div className="h-2 bg-gray-200 rounded w-20"></div>
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="space-y-1">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                            <div className="h-2 bg-gray-200 rounded w-20"></div>
                        </div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="h-5 bg-gray-200 rounded w-9"></div>
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
                                    <h3 className="text-2xl font-bold mt-1">{summary.total_staff}</h3>
                                </div>
                                <FiUsers className="w-6 h-6 opacity-80" />
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
                                    <h3 className="text-2xl font-bold mt-1">{summary.present}</h3>
                                </div>
                                <FiCheckCircle className="w-6 h-6 opacity-80" />
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
                                    <h3 className="text-2xl font-bold mt-1">{summary.absent}</h3>
                                </div>
                                <FiXCircle className="w-6 h-6 opacity-80" />
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
                                    <h3 className="text-2xl font-bold mt-1">{summary.breakdown?.pending || summary.pending || 0}</h3>
                                </div>
                                <FiClock className="w-6 h-6 opacity-80" />
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
                                    Verify and manage staff attendance with automatic salary calculation
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

                    {/* Bulk Action Bar */}
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
                                            Bulk Verify
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Professional Attendance Table */}
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
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            STAFF
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            DUTY
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            ATTENDANCE
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            STATUS
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-10">
                                            <div className="flex items-center justify-center">
                                                <div 
                                                    onClick={selectAllStaff}
                                                    className={`relative inline-flex items-center h-5 rounded-full w-9 cursor-pointer transition-all duration-200 ${allSelected ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                                                    title={allSelected ? "Deselect All" : "Select All"}
                                                >
                                                    <div 
                                                        className={`inline-block w-3 h-3 transform bg-white rounded-full transition-all duration-200 ${allSelected ? 'translate-x-5' : 'translate-x-1'}`}
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
                                            <td colSpan="5" className="px-4 py-8 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-3 bg-gray-100 rounded-full mb-3">
                                                        <FiUser className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-600 text-sm font-medium mb-1">No staff records found</p>
                                                    <p className="text-gray-500 text-xs">Try adjusting your search or filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredData.map((staff) => (
                                            <tr
                                                key={staff.attendance_id || staff.username}
                                                className={`transition-all duration-150 ${selectedStaff.has(staff.attendance_id) 
                                                    ? 'bg-blue-50' 
                                                    : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div 
                                                        className="flex items-center cursor-pointer group"
                                                        onClick={() => openStaffDetailModal(staff)}
                                                    >
                                                        <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-sm group-hover:shadow transition-all">
                                                            <span className="text-white font-semibold text-xs">
                                                                {staff.name?.split(' ').map(n => n[0]).join('') || 'NA'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                                {staff.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                <FiBriefcase className="w-3 h-3" />
                                                                {staff.designation || 'No Designation'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-xs font-medium text-gray-800 flex items-center gap-1">
                                                            <FiClock className="w-3 h-3 text-blue-500" />
                                                            {staff.duty_time?.schedule || '09:00 to 18:00'}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {staff.duty_time?.expected_hours || 8}h expected
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    {staff.in_time !== '00:00' ? (
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-green-600 font-medium">IN:</span>
                                                                <span>{formatTimeDisplay(staff.in_time)}</span>
                                                                {staff.punch_in_status?.is_late && (
                                                                    <span className="text-red-500 text-xs">({staff.punch_in_status.formatted})</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-red-600 font-medium">OUT:</span>
                                                                <span>{formatTimeDisplay(staff.out_time)}</span>
                                                                {staff.punch_out_status?.is_early && (
                                                                    <span className="text-orange-500 text-xs">({staff.punch_out_status.formatted})</span>
                                                                )}
                                                            </div>
                                                            {staff.working_hours && (
                                                                <div className="text-xs text-gray-500">
                                                                    {staff.working_hours.formatted}
                                                                    {staff.working_hours.extra_minutes > 0 && staff.feature_status?.overtime?.enabled && (
                                                                        <span className="text-green-600 ml-1">
                                                                            (+{Math.floor(staff.working_hours.extra_minutes/60)}h)
                                                                        </span>
                                                                    )}
                                                                    {staff.working_hours.less_minutes > 0 && staff.feature_status?.fine?.enabled && !staff.is_verified && (
                                                                        <span className="text-orange-600 ml-1">
                                                                            (-{Math.floor(staff.working_hours.less_minutes/60)}h)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs text-gray-400 italic">Not marked</span>
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => createAndVerifyAttendance(staff, 'present', { punch_in: '09:00:00', punch_out: '18:00:00' })}
                                                                    disabled={verifyLoading[staff.attendance_id || staff.username]}
                                                                    className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                                                                >
                                                                    Mark Present
                                                                </button>
                                                                <button
                                                                    onClick={() => createAndVerifyAttendance(staff, 'absent')}
                                                                    disabled={verifyLoading[staff.attendance_id || staff.username]}
                                                                    className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                                                                >
                                                                    Mark Absent
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className={getStatusBadge(staff.status, staff.is_verified)}>
                                                        {getStatusIcon(staff.status)}
                                                        {getStatusDisplay(staff.status)}
                                                        {staff.is_verified && <FiCheck className="w-3 h-3 ml-1" />}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => toggleMenu(staff.attendance_id || staff.username)}
                                                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <FiMoreVertical className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                        
                                                        {openMenuId === (staff.attendance_id || staff.username) && (
                                                            <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                                                {staff.attendance_id && (
                                                                    <button
                                                                        onClick={() => {
                                                                            openVerifyModal(staff);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                                                                    >
                                                                        <FiCheckSquare className="w-3 h-3" />
                                                                        {staff.is_verified ? 'Re-Verify' : 'Verify'}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        openSalaryModal(staff);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-lg"
                                                                >
                                                                    <FiDollarSign className="w-3 h-3" />
                                                                    Salary
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">
                                    Showing <span className="font-semibold">{filteredData.length}</span> staff members
                                </span>
                                {selectedStaff.size > 0 && (
                                    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                                        {selectedStaff.size} selected
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Staff Detail Modal */}
            <AnimatePresence>
                {showStaffDetailModal && selectedStaffDetail && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowStaffDetailModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-5 rounded-t-xl">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                                            <FiUser className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">{selectedStaffDetail.name}</h3>
                                            <p className="text-blue-100 text-sm">{selectedStaffDetail.designation}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowStaffDetailModal(false)}
                                        className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                                    >
                                        <FiXCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Username</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedStaffDetail.username}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Mobile</p>
                                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                            <FiPhone className="w-3 h-3 text-gray-400" />
                                            {selectedStaffDetail.mobile}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                        <FiMail className="w-3 h-3 text-gray-400" />
                                        {selectedStaffDetail.email || 'Not provided'}
                                    </p>
                                </div>

                                <div className="border-t border-gray-200 pt-3">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Duty Schedule</p>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Start Time:</span>
                                            <span className="font-medium">{selectedStaffDetail.duty_time?.start || '09:00'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-gray-600">End Time:</span>
                                            <span className="font-medium">{selectedStaffDetail.duty_time?.end || '18:00'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-gray-600">Expected Hours:</span>
                                            <span className="font-medium">{selectedStaffDetail.duty_time?.expected_hours || 8} hours</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-3">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Feature Settings</p>
                                    <div className="flex gap-3">
                                        <span className={`px-2 py-1 rounded text-xs ${selectedStaffDetail.feature_status?.overtime?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            OT: {selectedStaffDetail.feature_status?.overtime?.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs ${selectedStaffDetail.feature_status?.fine?.enabled ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                            Fine: {selectedStaffDetail.feature_status?.fine?.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-3">
                                    <button
                                        onClick={() => {
                                            setShowStaffDetailModal(false);
                                            if (selectedStaffDetail.attendance_id) {
                                                openVerifyModal(selectedStaffDetail);
                                            } else {
                                                createAndVerifyAttendance(selectedStaffDetail, 'present', { punch_in: '09:00:00', punch_out: '18:00:00' });
                                            }
                                        }}
                                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-colors"
                                    >
                                        {selectedStaffDetail.attendance_id ? 'Verify Attendance' : 'Mark Present'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Individual Verification Modal */}
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
                            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-5 rounded-t-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold">{selectedAttendance.is_verified ? 'Re-Verify Attendance' : 'Verify Attendance'}</h3>
                                        <p className="text-blue-100 text-sm mt-1">
                                            {selectedAttendance.name} • {selectedAttendance.designation}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowVerifyModal(false)}
                                        className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                                    >
                                        <FiXCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-5">
                                {/* Current Punch Times with Edit Option */}
                                <div className="mb-5 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <h4 className="text-xs font-semibold text-blue-800 mb-3 flex items-center gap-1">
                                        <FiClock className="w-3 h-3" />
                                        Punch Times (Can be modified)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-blue-600 block mb-1">Punch In Time</label>
                                            <input
                                                type="time"
                                                value={verifyForm.manual_punch_in}
                                                onChange={(e) => setVerifyForm({...verifyForm, manual_punch_in: e.target.value})}
                                                className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                            />
                                            {selectedAttendance.in_time !== '00:00' && !verifyForm.manual_punch_in && (
                                                <p className="text-xs text-blue-500 mt-1">
                                                    Original: {formatTimeDisplay(selectedAttendance.in_time)}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs text-blue-600 block mb-1">Punch Out Time</label>
                                            <input
                                                type="time"
                                                value={verifyForm.manual_punch_out}
                                                onChange={(e) => setVerifyForm({...verifyForm, manual_punch_out: e.target.value})}
                                                className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                            />
                                            {selectedAttendance.out_time !== '00:00' && !verifyForm.manual_punch_out && (
                                                <p className="text-xs text-blue-500 mt-1">
                                                    Original: {formatTimeDisplay(selectedAttendance.out_time)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Verification Status Selection */}
                                <div className="mb-5">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Verification Status
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedAttendance.available_options?.map((option) => (
                                            <label
                                                key={option.value}
                                                className={`flex items-center p-2 rounded-lg border transition-all cursor-pointer ${
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
                                                        }
                                                    }}
                                                    disabled={!option.enabled}
                                                    className="mr-2"
                                                />
                                                <span className={`text-sm ${verifyForm.verify_status === option.value ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                                    {option.label}
                                                </span>
                                                {!option.enabled && option.disabled_reason && (
                                                    <span className="ml-1 text-xs text-gray-400" title={option.disabled_reason}>
                                                        ⓘ
                                                    </span>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Admin Remarks */}
                                <div className="mb-5">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Admin Remarks
                                    </label>
                                    <textarea
                                        value={verifyForm.admin_remarks}
                                        onChange={(e) => setVerifyForm({...verifyForm, admin_remarks: e.target.value})}
                                        rows="2"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Enter verification remarks..."
                                    />
                                </div>

                                {/* Break Consideration Toggle */}
                                <div className="mb-5 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                                <FiCoffee className="w-4 h-4" />
                                                Consider Break Time
                                            </span>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {verifyForm.consider_break 
                                                    ? "Break time deducted from working hours" 
                                                    : "Break time NOT deducted"}
                                            </p>
                                        </div>
                                        <div
                                            onClick={() => setVerifyForm(prev => ({ ...prev, consider_break: !prev.consider_break }))}
                                            className={`relative inline-flex items-center h-5 rounded-full w-10 cursor-pointer transition-all duration-200 ${
                                                verifyForm.consider_break ? 'bg-orange-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <div className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-all duration-200 ${
                                                verifyForm.consider_break ? 'translate-x-5.5' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                    {selectedAttendance?.break_summary?.excess_break_minutes > 0 && (
                                        <div className="mt-2 text-xs text-orange-600">
                                            Excess break: {selectedAttendance.break_summary.excess_break_minutes} min
                                            {verifyForm.consider_break && selectedAttendance.break_summary.break_penalty_amount > 0 && 
                                                ` (Penalty: ${formatCurrency(selectedAttendance.break_summary.break_penalty_amount)})`
                                            }
                                        </div>
                                    )}
                                </div>

                                {/* Salary Adjustment Toggles */}
                                <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            <FiPlusCircle className="w-4 h-4 text-green-600" />
                                            Apply Travel Allowance
                                        </span>
                                        <div
                                            onClick={() => setVerifyForm(prev => ({ ...prev, apply_travel_allowance: !prev.apply_travel_allowance }))}
                                            className={`relative inline-flex items-center h-5 rounded-full w-10 cursor-pointer transition-all duration-200 ${
                                                verifyForm.apply_travel_allowance ? 'bg-green-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <div className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-all duration-200 ${
                                                verifyForm.apply_travel_allowance ? 'translate-x-5.5' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            <FiMinusCircle className="w-4 h-4 text-red-600" />
                                            Apply Other Deductions
                                        </span>
                                        <div
                                            onClick={() => setVerifyForm(prev => ({ ...prev, apply_other_deductions: !prev.apply_other_deductions }))}
                                            className={`relative inline-flex items-center h-5 rounded-full w-10 cursor-pointer transition-all duration-200 ${
                                                verifyForm.apply_other_deductions ? 'bg-green-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <div className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-all duration-200 ${
                                                verifyForm.apply_other_deductions ? 'translate-x-5.5' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Calculation Preview */}
                                {calculationPreview && (
                                    <div className="mb-5 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Salary Preview</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Base Amount:</span>
                                                <span>{formatCurrency(calculationPreview.salary_breakdown?.base_amount || 0)}</span>
                                            </div>
                                            {calculationPreview.salary_breakdown?.overtime_amount > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>+ Overtime:</span>
                                                    <span>{formatCurrency(calculationPreview.salary_breakdown?.overtime_amount || 0)}</span>
                                                </div>
                                            )}
                                            {calculationPreview.salary_breakdown?.fine_amount > 0 && (
                                                <div className="flex justify-between text-orange-600">
                                                    <span>- Fine:</span>
                                                    <span>{formatCurrency(calculationPreview.salary_breakdown?.fine_amount || 0)}</span>
                                                </div>
                                            )}
                                            {calculationPreview.salary_breakdown?.break_penalty < 0 && (
                                                <div className="flex justify-between text-red-600">
                                                    <span>- Break Penalty:</span>
                                                    <span>{formatCurrency(Math.abs(calculationPreview.salary_breakdown?.break_penalty || 0))}</span>
                                                </div>
                                            )}
                                            {calculationPreview.salary_breakdown?.travel_allowance > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>+ Travel Allowance:</span>
                                                    <span>{formatCurrency(calculationPreview.salary_breakdown?.travel_allowance || 0)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-gray-200 pt-2 mt-2">
                                                <div className="flex justify-between font-bold">
                                                    <span>Final Amount:</span>
                                                    <span className="text-blue-600">{formatCurrency(calculationPreview.salary_breakdown?.final_amount || 0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowVerifyModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={previewCalculation}
                                        disabled={isPreviewLoading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isPreviewLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiEye className="w-4 h-4" />}
                                        Preview
                                    </button>
                                    <button
                                        onClick={verifyAttendance}
                                        disabled={verifyLoading[selectedAttendance.attendance_id]}
                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {verifyLoading[selectedAttendance.attendance_id] ? (
                                            <>
                                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <FiCheck className="w-4 h-4" />
                                                {selectedAttendance.is_verified ? 'Re-Verify' : 'Verify'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bulk Verify Modal */}
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
                            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-t-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold">Bulk Verify Attendance</h3>
                                        <p className="text-indigo-100 text-sm mt-1">
                                            {bulkVerifyData.length} staff members selected
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowBulkVerifyModal(false)}
                                        className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                                    >
                                        <FiXCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="mb-4 grid grid-cols-4 gap-2">
                                    <div className="bg-blue-50 p-2 rounded-lg text-center">
                                        <p className="text-xs text-blue-600">Total</p>
                                        <p className="text-lg font-bold text-blue-700">{bulkVerifyData.length}</p>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded-lg text-center">
                                        <p className="text-xs text-green-600">Present</p>
                                        <p className="text-lg font-bold text-green-700">
                                            {bulkVerifyData.filter(d => d.actual_status === 'present').length}
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 p-2 rounded-lg text-center">
                                        <p className="text-xs text-purple-600">Bonus</p>
                                        <p className="text-lg font-bold text-purple-700">
                                            {bulkVerifyData.filter(d => d.actual_status === 'bonus').length}
                                        </p>
                                    </div>
                                    <div className="bg-orange-50 p-2 rounded-lg text-center">
                                        <p className="text-xs text-orange-600">Fine/Absent</p>
                                        <p className="text-lg font-bold text-orange-700">
                                            {bulkVerifyData.filter(d => d.actual_status === 'fine' || d.actual_status === 'absent').length}
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Override Status (Optional)
                                    </label>
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    >
                                        <option value="">Auto-calculate from actual time</option>
                                        <option value="present">Present</option>
                                        <option value="half_day">Half Day</option>
                                        <option value="absent">Absent</option>
                                        <option value="paid_leave">Paid Leave</option>
                                        <option value="bonus">Bonus</option>
                                        <option value="fine">Fine</option>
                                    </select>
                                </div>

                                <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                                <FiCoffee className="w-4 h-4" />
                                                Consider Break Time for All
                                            </span>
                                        </div>
                                        <div
                                            onClick={() => setConsiderBreakBulk(!considerBreakBulk)}
                                            className={`relative inline-flex items-center h-5 rounded-full w-10 cursor-pointer transition-all duration-200 ${
                                                considerBreakBulk ? 'bg-orange-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <div className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-all duration-200 ${
                                                considerBreakBulk ? 'translate-x-5.5' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Common Remarks
                                    </label>
                                    <textarea
                                        value={commonRemarks}
                                        onChange={(e) => setCommonRemarks(e.target.value)}
                                        rows="2"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        placeholder="Add common remarks for all selected records..."
                                    />
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
                                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1"
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

            {/* Salary Calculation Modal */}
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
                            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-5 rounded-t-xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold">Salary Calculation</h3>
                                        <p className="text-blue-100 text-sm mt-1">
                                            {salaryData.staff_info?.name} • {salaryData.staff_info?.designation}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowSalaryModal(false)}
                                        className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                                    >
                                        <FiXCircle className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => {
                                            setSelectedMonth(parseInt(e.target.value));
                                            fetchSalaryCalculation(selectedStaffForSalary?.username, parseInt(e.target.value), selectedYear);
                                        }}
                                        className="px-2 py-1 text-xs rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                            <option key={month} value={month}>
                                                {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'short' })}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => {
                                            setSelectedYear(parseInt(e.target.value));
                                            fetchSalaryCalculation(selectedStaffForSalary?.username, selectedMonth, parseInt(e.target.value));
                                        }}
                                        className="px-2 py-1 text-xs rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none"
                                    >
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {salaryLoading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-3 text-gray-600 text-sm">Loading salary data...</p>
                                </div>
                            ) : (
                                <div className="p-5">
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <p className="text-xs text-gray-500">Month/Year</p>
                                                <p className="font-semibold">{salaryData.period?.month_name} {salaryData.period?.year}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Monthly Salary</p>
                                                <p className="font-semibold">{formatCurrency(salaryData.salary_configuration?.monthly_salary || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Per Day</p>
                                                <p className="font-semibold">{formatCurrency(parseFloat(salaryData.salary_configuration?.per_day_salary) || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Total Earned</p>
                                                <p className="font-semibold text-green-600">{formatCurrency(parseFloat(salaryData.monthly_summary?.salary_calculation?.total_earned || 0))}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="border-b border-gray-200">
                                            <nav className="flex gap-4">
                                                <button
                                                    className={`pb-2 px-1 text-sm font-medium transition-colors ${
                                                        activeTab === 'full' 
                                                            ? 'text-blue-600 border-b-2 border-blue-600' 
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                    onClick={() => setActiveTab('full')}
                                                >
                                                    Full Month
                                                </button>
                                                <button
                                                    className={`pb-2 px-1 text-sm font-medium transition-colors ${
                                                        activeTab === 'tilldate' 
                                                            ? 'text-blue-600 border-b-2 border-blue-600' 
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                    onClick={() => setActiveTab('tilldate')}
                                                >
                                                    Till Date
                                                    {salaryData.till_date_summary?.calculated_upto?.is_current_month && (
                                                        <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Live</span>
                                                    )}
                                                </button>
                                            </nav>
                                        </div>
                                    </div>

                                    {activeTab === 'full' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                <div className="bg-green-50 p-2 rounded-lg text-center">
                                                    <p className="text-xs text-green-600">Present</p>
                                                    <p className="text-lg font-bold text-green-700">{salaryData.monthly_summary?.attendance_summary?.present || 0}</p>
                                                </div>
                                                <div className="bg-purple-50 p-2 rounded-lg text-center">
                                                    <p className="text-xs text-purple-600">Bonus</p>
                                                    <p className="text-lg font-bold text-purple-700">{salaryData.monthly_summary?.attendance_summary?.bonus || 0}</p>
                                                </div>
                                                <div className="bg-orange-50 p-2 rounded-lg text-center">
                                                    <p className="text-xs text-orange-600">Fine</p>
                                                    <p className="text-lg font-bold text-orange-700">{salaryData.monthly_summary?.attendance_summary?.fine || 0}</p>
                                                </div>
                                                <div className="bg-yellow-50 p-2 rounded-lg text-center">
                                                    <p className="text-xs text-yellow-600">Half Day</p>
                                                    <p className="text-lg font-bold text-yellow-700">{salaryData.monthly_summary?.attendance_summary?.half_day || 0}</p>
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-200 pt-3">
                                                <div className="flex justify-between items-center py-2">
                                                    <span className="text-gray-600">Base Salary (Present Days)</span>
                                                    <span className="font-semibold">{formatCurrency(parseFloat(salaryData.monthly_summary?.salary_calculation?.base_salary_earned || 0))}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 text-green-600">
                                                    <span>+ Overtime Bonus</span>
                                                    <span>{formatCurrency(Math.abs(parseFloat(salaryData.monthly_summary?.salary_calculation?.bonus_adjustment || 0)))}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 text-orange-600">
                                                    <span>- Fine Deduction</span>
                                                    <span>{formatCurrency(Math.abs(parseFloat(salaryData.monthly_summary?.salary_calculation?.fine_adjustment || 0)))}</span>
                                                </div>
                                                <div className="border-t border-gray-200 mt-2 pt-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold">Total Salary</span>
                                                        <span className="text-xl font-bold text-blue-600">{formatCurrency(parseFloat(salaryData.monthly_summary?.salary_calculation?.total_earned || 0))}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'tilldate' && salaryData.till_date_summary && (
                                        <div className="space-y-4">
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-green-800">Earned Till Date</span>
                                                    <span className="text-xl font-bold text-green-700">{formatCurrency(parseFloat(salaryData.till_date_summary.salary_calculation?.actual_earned_till_date || 0))}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-1 text-sm">
                                                    <span className="text-green-700">Expected (Pro-rated)</span>
                                                    <span className="font-semibold">{formatCurrency(parseFloat(salaryData.till_date_summary.salary_calculation?.expected_salary_till_date || 0))}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className={`text-sm ${parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0) >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                                                        {parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0) >= 0 ? 'Extra Earned' : 'Shortfall'}
                                                    </span>
                                                    <span className={`font-semibold ${parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0) >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                                                        {formatCurrency(Math.abs(parseFloat(salaryData.till_date_summary.salary_calculation?.difference || 0)))}
                                                    </span>
                                                </div>
                                            </div>

                                            {salaryData.till_date_summary.projection && (
                                                <div className="bg-purple-50 p-3 rounded-lg">
                                                    <p className="text-xs font-semibold text-purple-800 mb-2">Month End Projection</p>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-purple-700">Estimated Total</span>
                                                        <span className="text-xl font-bold text-purple-700">{formatCurrency(parseFloat(salaryData.till_date_summary.projection?.estimated_month_end_salary || 0))}</span>
                                                    </div>
                                                    <p className="text-xs text-purple-600 mt-2">{salaryData.till_date_summary.projection?.note}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
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