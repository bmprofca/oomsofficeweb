import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";

const SalaryTab = ({ salary, setSalary, variants }) => {
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [salaryData, setSalaryData] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [updatingDay, setUpdatingDay] = useState(null);
    const [weeklyOffData, setWeeklyOffData] = useState(null);
    const [loadingWeeklyOff, setLoadingWeeklyOff] = useState(false);
    const [selectedSalaryDetails, setSelectedSalaryDetails] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [newSalary, setNewSalary] = useState({
        username: '',
        monthly_salary: '',
        effective_from: '',
        working_hours_start: '09:00:00',
        working_hours_end: '18:00:00',
        expected_hours: '8',
        grace_period_minutes: '15',
        overtime_rate_type: 'daily',
        fine_rate_type: 'daily',
        overtime_enabled: false,
        fine_enabled: false,
        allowed_break_minutes: '30',
        break_excess_penalty_type: 'fixed',
        break_excess_penalty_value: '0',
        travel_allowance_type: 'fixed',
        travel_allowance_value: '0',
        other_deduction_type: 'percentage',
        other_deduction_value: '0'
    });
    
    const location = useLocation();
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Extract username from URL query parameters
    const getUsernameFromUrl = () => {
        const params = new URLSearchParams(location.search);
        return params.get('username');
    };

    // Fetch salary history and weekly off when component mounts
    useEffect(() => {
        const username = getUsernameFromUrl();
        if (username) {
            setNewSalary(prev => ({ ...prev, username }));
            fetchSalaryHistory(username);
            fetchWeeklyOff(username);
        }
    }, [location.search]);

    const fetchWeeklyOff = async (username) => {
        try {
            setLoadingWeeklyOff(true);
            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/get-weekly-off?username=${username}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch weekly off');
            }
            
            const data = await response.json();
            if (data.success) {
                setWeeklyOffData(data.data);
            }
        } catch (err) {
            console.error('Error fetching weekly off:', err);
            toast.error(`Error fetching weekly off: ${err.message}`);
        } finally {
            setLoadingWeeklyOff(false);
        }
    };

    const fetchSalaryHistory = async (username) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/salary-history?username=${username}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch salary history');
            }
            
            const result = await response.json();
            if (result.success) {
                setSalaryData(result.data);
                
                // Format all salaries for display in single table
                const allSalaries = [];
                
                // Add current salary (active)
                if (result.data.current) {
                    allSalaries.push({
                        id: result.data.current.id,
                        salary_id: result.data.current.salary_id,
                        monthly_salary: result.data.current.monthly_salary,
                        effective_from: result.data.current.effective_from,
                        effective_to: result.data.current.effective_to,
                        status: 'active',
                        status_display: 'Active',
                        status_color: 'green',
                        effective_from_display: new Date(result.data.current.effective_from).toLocaleDateString('en-IN'),
                        // Working hours
                        working_hours: result.data.current.working_hours,
                        // Overtime settings
                        overtime_settings: result.data.current.overtime_settings,
                        // Fine settings
                        fine_settings: result.data.current.fine_settings,
                        // Break settings
                        break_settings: result.data.current.break_settings,
                        // Travel allowance
                        travel_allowance: result.data.current.travel_allowance,
                        // Other deductions
                        other_deductions: result.data.current.other_deductions,
                        // Staff info
                        staff_name: result.data.current.staff_name,
                        designation: result.data.current.designation,
                        // Full details object
                        full_details: result.data.current
                    });
                }
                
                // Add scheduled salaries
                if (result.data.scheduled && result.data.scheduled.length > 0) {
                    result.data.scheduled.forEach(s => {
                        allSalaries.push({
                            ...s,
                            status: 'scheduled',
                            status_display: 'Scheduled',
                            status_color: 'blue',
                            effective_from_display: s.effective_from ? new Date(s.effective_from).toLocaleDateString('en-IN') : '-',
                            full_details: s
                        });
                    });
                }
                
                // Add history salaries
                if (result.data.history && result.data.history.length > 0) {
                    result.data.history.forEach(s => {
                        allSalaries.push({
                            ...s,
                            status: 'expired',
                            status_display: 'Expired',
                            status_color: 'gray',
                            effective_from_display: s.effective_from ? new Date(s.effective_from).toLocaleDateString('en-IN') : '-',
                            effective_to_display: s.effective_to ? new Date(s.effective_to).toLocaleDateString('en-IN') : '-',
                            full_details: s
                        });
                    });
                }
                
                setSalary({
                    list: allSalaries
                });
            }
        } catch (err) {
            setError(err.message);
            toast.error(`Error fetching salary history: ${err.message}`);
            console.error('Error fetching salary history:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNewSalary = async () => {
        const username = getUsernameFromUrl();
        if (!username || !newSalary.monthly_salary || !newSalary.effective_from) {
            toast.warning('Please fill in all required fields');
            return;
        }

        const loadingToast = toast.loading('Adding salary structure...');

        try {
            setLoading(true);
            setError(null);
            
            // Convert values properly
            const overtimeEnabledValue = newSalary.overtime_enabled === true ? true : false;
            const fineEnabledValue = newSalary.fine_enabled === true ? true : false;
            
            const requestData = {
                username: username,
                monthly_salary: parseFloat(newSalary.monthly_salary),
                effective_from: newSalary.effective_from,
                working_hours_start: newSalary.working_hours_start,
                working_hours_end: newSalary.working_hours_end,
                expected_hours: parseFloat(newSalary.expected_hours),
                grace_period_minutes: parseInt(newSalary.grace_period_minutes),
                overtime_rate_type: newSalary.overtime_rate_type,
                fine_rate_type: newSalary.fine_rate_type,
                overtime_enabled: overtimeEnabledValue,
                fine_enabled: fineEnabledValue,
                allowed_break_minutes: parseInt(newSalary.allowed_break_minutes),
                break_excess_penalty_type: newSalary.break_excess_penalty_type,
                break_excess_penalty_value: parseFloat(newSalary.break_excess_penalty_value),
                travel_allowance_type: newSalary.travel_allowance_type,
                travel_allowance_value: parseFloat(newSalary.travel_allowance_value),
                other_deduction_type: newSalary.other_deduction_type,
                other_deduction_value: parseFloat(newSalary.other_deduction_value)
            };
            
            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/set-salary`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(requestData)
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add salary');
            }
            
            const data = await response.json();
            if (data.success) {
                toast.update(loadingToast, {
                    render: data.data.is_active ? 'Salary structure added successfully!' : 'Salary structure scheduled for future date!',
                    type: 'success',
                    isLoading: false,
                    autoClose: 3000
                });
                setShowAddForm(false);
                setNewSalary({
                    username: username,
                    monthly_salary: '',
                    effective_from: '',
                    working_hours_start: '09:00:00',
                    working_hours_end: '18:00:00',
                    expected_hours: '8',
                    grace_period_minutes: '15',
                    overtime_rate_type: 'daily',
                    fine_rate_type: 'daily',
                    overtime_enabled: false,
                    fine_enabled: false,
                    allowed_break_minutes: '30',
                    break_excess_penalty_type: 'fixed',
                    break_excess_penalty_value: '0',
                    travel_allowance_type: 'fixed',
                    travel_allowance_value: '0',
                    other_deduction_type: 'percentage',
                    other_deduction_value: '0'
                });
                fetchSalaryHistory(username);
            }
        } catch (err) {
            setError(err.message);
            toast.update(loadingToast, {
                render: `Failed to add salary: ${err.message}`,
                type: 'error',
                isLoading: false,
                autoClose: 5000
            });
            console.error('Error adding salary:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (day) => {
        const username = getUsernameFromUrl();
        if (!username) {
            toast.error('No username selected');
            return;
        }

        const currentWeeklyOffDay = weeklyOffData?.weekly_off?.weekly_off_day;
        const isCurrentlyPaid = currentWeeklyOffDay === day;
        
        if (!isCurrentlyPaid && currentWeeklyOffDay) {
            const confirmResult = await new Promise((resolve) => {
                toast.info(
                    <div>
                        <p className="font-medium">Change Weekly Off?</p>
                        <p className="text-sm mt-1">
                            You already have {currentWeeklyOffDay} as weekly off. 
                            Setting {day} as weekly off will replace it.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => {
                                    toast.dismiss();
                                    resolve(true);
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                            >
                                Yes, Replace
                            </button>
                            <button
                                onClick={() => {
                                    toast.dismiss();
                                    resolve(false);
                                }}
                                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>,
                    {
                        autoClose: false,
                        closeOnClick: false,
                        draggable: false
                    }
                );
            });

            if (!confirmResult) {
                return;
            }
        }

        const newStatus = !isCurrentlyPaid;
        const action = newStatus ? 'Setting' : 'Removing';
        const toggleToast = toast.loading(`${action} ${day} as weekly off...`);

        try {
            const response = await fetch(
                `${API_BASE_URL}/attendance/admin/set-weekly-off`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        username: username,
                        weekly_off_day: day,
                        is_active: newStatus ? "1" : "0"
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to update weekly off');
            }
            
            const data = await response.json();
            if (data.success) {
                toast.update(toggleToast, {
                    render: newStatus 
                        ? `${day} is now set as weekly off` 
                        : `${day} removed from weekly off`,
                    type: 'success',
                    isLoading: false,
                    autoClose: 3000
                });
                
                setWeeklyOffData({
                    ...weeklyOffData,
                    weekly_off: {
                        weekly_off_day: newStatus ? day : null,
                        is_active: newStatus
                    }
                });
            }
        } catch (err) {
            toast.update(toggleToast, {
                render: `Failed to update weekly off: ${err.message}`,
                type: 'error',
                isLoading: false,
                autoClose: 5000
            });
            console.error('Error updating weekly off:', err);
        }
    };

    const handleEdit = (id) => {
        setEditingId(id);
        toast.info('Edit mode activated');
    };

    const handleDelete = async (id) => {
        const confirmDelete = await new Promise((resolve) => {
            toast.warning(
                <div>
                    <p className="font-medium">Delete Salary Entry?</p>
                    <p className="text-sm mt-1">Are you sure you want to delete this salary entry? This action cannot be undone.</p>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => {
                                toast.dismiss();
                                resolve(true);
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                            Yes, Delete
                        </button>
                        <button
                            onClick={() => {
                                toast.dismiss();
                                resolve(false);
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>,
                {
                    autoClose: false,
                    closeOnClick: false,
                    draggable: false
                }
            );
        });

        if (confirmDelete) {
            toast.info('Delete functionality to be implemented');
            console.log('Deleting:', id);
        }
    };

    const handleViewDetails = (item) => {
        setSelectedSalaryDetails(item);
        setShowDetailsModal(true);
    };

    const formatTimeTo12Hour = (time24) => {
        if (!time24) return '09:00 AM';
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const ToggleSwitch = ({ enabled, onChange }) => (
        <button
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );

    const ViewIcon = () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );

    const EditIcon = () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    );

    const DeleteIcon = () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );

    const PlusIcon = () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );

    const ClockIcon = () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const InfoIcon = () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const CloseIcon = () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );

    const LoadingSpinner = () => (
        <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    const username = getUsernameFromUrl();
    const currentWeeklyOffDay = weeklyOffData?.weekly_off?.weekly_off_day;

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Salary Management</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {username ? `Managing salary for user: ${username}` : 'Configure salary structure and weekly off'}
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    disabled={!username}
                >
                    <PlusIcon />
                    Add Salary Structure
                </motion.button>
            </div>

            {/* Add Salary Form */}
            {showAddForm && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Salary Structure</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                value={username || ''}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
                            <input
                                type="number"
                                value={newSalary.monthly_salary}
                                onChange={(e) => setNewSalary({...newSalary, monthly_salary: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter amount"
                                min="0"
                                step="1000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                            <input
                                type="date"
                                value={newSalary.effective_from}
                                onChange={(e) => setNewSalary({...newSalary, effective_from: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                min={new Date().toISOString().split('T')[0]}
                            />
                            <p className="text-xs text-gray-500 mt-1">Cannot set salary for past dates</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours Start</label>
                            <input
                                type="time"
                                value={newSalary.working_hours_start}
                                onChange={(e) => setNewSalary({...newSalary, working_hours_start: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours End</label>
                            <input
                                type="time"
                                value={newSalary.working_hours_end}
                                onChange={(e) => setNewSalary({...newSalary, working_hours_end: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Hours/Day</label>
                            <input
                                type="number"
                                value={newSalary.expected_hours}
                                onChange={(e) => setNewSalary({...newSalary, expected_hours: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="8"
                                step="0.5"
                                min="1"
                                max="12"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Minutes)</label>
                            <input
                                type="number"
                                value={newSalary.grace_period_minutes}
                                onChange={(e) => setNewSalary({...newSalary, grace_period_minutes: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="15"
                                min="0"
                                max="60"
                            />
                            <p className="text-xs text-gray-500 mt-1">Time allowed before counting as overtime/fine</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Rate Type</label>
                            <select
                                value={newSalary.overtime_rate_type}
                                onChange={(e) => setNewSalary({...newSalary, overtime_rate_type: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="daily">Daily (Per Minute Rate)</option>
                                <option value="monthly">Monthly (Percentage of Monthly Salary)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fine Rate Type</label>
                            <select
                                value={newSalary.fine_rate_type}
                                onChange={(e) => setNewSalary({...newSalary, fine_rate_type: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="daily">Daily (Per Minute Rate)</option>
                                <option value="monthly">Monthly (Percentage of Monthly Salary)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={newSalary.overtime_enabled}
                                    onChange={(e) => {
                                        console.log('Overtime checkbox changed to:', e.target.checked);
                                        setNewSalary({...newSalary, overtime_enabled: e.target.checked});
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Enable Overtime</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={newSalary.fine_enabled}
                                    onChange={(e) => {
                                        console.log('Fine checkbox changed to:', e.target.checked);
                                        setNewSalary({...newSalary, fine_enabled: e.target.checked});
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Enable Fine/Deduction</span>
                            </label>
                        </div>
                    </div>

                    {/* Break Settings Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <h4 className="text-md font-semibold text-gray-800 mb-4">Break Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Break Minutes</label>
                                <input
                                    type="number"
                                    value={newSalary.allowed_break_minutes}
                                    onChange={(e) => setNewSalary({...newSalary, allowed_break_minutes: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="30"
                                    min="0"
                                    step="5"
                                />
                                <p className="text-xs text-gray-500 mt-1">Default break time allowed per day</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Break Excess Penalty Type</label>
                                <select
                                    value={newSalary.break_excess_penalty_type}
                                    onChange={(e) => setNewSalary({...newSalary, break_excess_penalty_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="fixed">Fixed Amount (₹ per minute)</option>
                                    <option value="percentage">Percentage of Per-Minute Salary</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {newSalary.break_excess_penalty_type === 'fixed' ? 'Penalty Amount (₹/minute)' : 'Penalty Percentage (%)'}
                                </label>
                                <input
                                    type="number"
                                    value={newSalary.break_excess_penalty_value}
                                    onChange={(e) => setNewSalary({...newSalary, break_excess_penalty_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={newSalary.break_excess_penalty_type === 'fixed' ? 'e.g., 10' : 'e.g., 50'}
                                    min="0"
                                    step={newSalary.break_excess_penalty_type === 'fixed' ? "1" : "1"}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {newSalary.break_excess_penalty_type === 'fixed' 
                                        ? 'Fixed amount deducted per excess minute' 
                                        : 'Percentage of per-minute salary deducted per excess minute'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Travel Allowance Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <h4 className="text-md font-semibold text-gray-800 mb-4">Travel Allowance</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Travel Allowance Type</label>
                                <select
                                    value={newSalary.travel_allowance_type}
                                    onChange={(e) => setNewSalary({...newSalary, travel_allowance_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="fixed">Fixed Amount (₹)</option>
                                    <option value="percentage">Percentage of Base Salary</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {newSalary.travel_allowance_type === 'fixed' ? 'Travel Allowance (₹)' : 'Travel Allowance (%)'}
                                </label>
                                <input
                                    type="number"
                                    value={newSalary.travel_allowance_value}
                                    onChange={(e) => setNewSalary({...newSalary, travel_allowance_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={newSalary.travel_allowance_type === 'fixed' ? 'e.g., 500' : 'e.g., 5'}
                                    min="0"
                                    step={newSalary.travel_allowance_type === 'fixed' ? "1" : "0.5"}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Other Deductions Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <h4 className="text-md font-semibold text-gray-800 mb-4">Other Deductions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Other Deduction Type</label>
                                <select
                                    value={newSalary.other_deduction_type}
                                    onChange={(e) => setNewSalary({...newSalary, other_deduction_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="fixed">Fixed Amount (₹)</option>
                                    <option value="percentage">Percentage of Base Salary</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {newSalary.other_deduction_type === 'fixed' ? 'Deduction Amount (₹)' : 'Deduction Percentage (%)'}
                                </label>
                                <input
                                    type="number"
                                    value={newSalary.other_deduction_value}
                                    onChange={(e) => setNewSalary({...newSalary, other_deduction_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={newSalary.other_deduction_type === 'fixed' ? 'e.g., 1000' : 'e.g., 5'}
                                    min="0"
                                    step={newSalary.other_deduction_type === 'fixed' ? "1" : "0.5"}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddNewSalary}
                            disabled={loading || !newSalary.monthly_salary || !newSalary.effective_from}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Adding...' : 'Add Salary'}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    Error: {error}
                </div>
            )}

            {/* Staff Profile Info */}
            {salaryData?.profile && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-4">
                        {salaryData.profile.image ? (
                            <img 
                                src={salaryData.profile.image} 
                                alt={salaryData.profile.name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-indigo-600 font-semibold text-lg">
                                    {salaryData.profile.name?.charAt(0) || 'U'}
                                </span>
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold text-gray-900">{salaryData.profile.name}</h3>
                            <p className="text-sm text-gray-600">{salaryData.profile.designation}</p>
                            <p className="text-xs text-gray-500">
                                {salaryData.profile.email} • {salaryData.profile.mobile}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Month Summary Cards */}
            {salaryData?.current_month_summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-500">Total Earned (This Month)</h4>
                            <span className="text-green-600 text-lg font-bold">₹</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                            ₹{salaryData.current_month_summary.total_earned}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {salaryData.current_month_summary.period.month_name} {salaryData.current_month_summary.period.year}
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-500">Overtime (Bonus Days)</h4>
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                            {salaryData.current_month_summary.overtime.bonus_days} days
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {salaryData.current_month_summary.overtime.total_extra_hours} hours overtime
                        </p>
                        <p className="text-xs text-gray-400">
                            ₹{salaryData.current_month_summary.overtime.total_overtime_amount} earned
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-500">Fine (Deduction Days)</h4>
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                        </div>
                        <p className="text-2xl font-bold text-red-600 mt-2">
                            {salaryData.current_month_summary.fine.fine_days} days
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {salaryData.current_month_summary.fine.total_less_hours} hours less
                        </p>
                        <p className="text-xs text-gray-400">
                            ₹{salaryData.current_month_summary.fine.total_fine_amount} deducted
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-500">Monthly Salary</h4>
                            <ClockIcon className="text-indigo-500" />
                        </div>
                        <p className="text-2xl font-bold text-indigo-600 mt-2">
                            ₹{salaryData.current?.monthly_salary?.toLocaleString('en-IN') || '0'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Per Day: ₹{((salaryData.current?.monthly_salary || 0) / 30).toFixed(2)}
                        </p>
                    </div>
                </div>
            )}

            {/* Single Table for All Salaries - Minimal Design */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900">Salary History</h3>
                </div>
                
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Hrs</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective From</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective To</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {salary.list.length > 0 ? (
                                        salary.list.map((item, index) => {
                                            // Determine row styling based on status
                                            let rowClass = "hover:bg-gray-50 transition-colors";
                                            let statusBadgeClass = "";
                                            let statusDotClass = "";
                                            
                                            if (item.status === 'active') {
                                                rowClass = "bg-green-50 hover:bg-green-100 transition-colors";
                                                statusBadgeClass = "bg-green-100 text-green-700";
                                                statusDotClass = "bg-green-500";
                                            } else if (item.status === 'scheduled') {
                                                statusBadgeClass = "bg-blue-100 text-blue-700";
                                                statusDotClass = "bg-blue-500";
                                            } else {
                                                statusBadgeClass = "bg-gray-100 text-gray-600";
                                                statusDotClass = "bg-gray-400";
                                            }
                                            
                                            return (
                                                <motion.tr 
                                                    key={item.id || index}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className={rowClass}
                                                >
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="text-sm font-semibold text-gray-900">₹{item.monthly_salary?.toLocaleString('en-IN') || item.amount}</span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${statusDotClass}`}></div>
                                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClass}`}>
                                                                {item.status === 'active' ? 'Active' : (item.status === 'scheduled' ? 'Scheduled' : 'Expired')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <span>{item.working_hours ? formatTimeTo12Hour(item.working_hours.start) : '09:00 AM'}</span>
                                                            <span>-</span>
                                                            <span>{item.working_hours ? formatTimeTo12Hour(item.working_hours.end) : '06:00 PM'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                                        {item.working_hours ? `${item.working_hours.expected_hours}h` : '8h'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                                            {item.effective_from_display || (item.effective_from ? new Date(item.effective_from).toLocaleDateString('en-IN') : '-')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                                            {item.effective_to ? new Date(item.effective_to).toLocaleDateString('en-IN') : (item.status === 'active' ? 'Current' : (item.status === 'scheduled' ? 'Upcoming' : 'Expired'))}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleViewDetails(item)}
                                                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                                                                title="View Details"
                                                            >
                                                                <ViewIcon />
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleEdit(item.id)}
                                                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                                                title="Edit"
                                                            >
                                                                <EditIcon />
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleDelete(item.id)}
                                                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                                                title="Delete"
                                                            >
                                                                <DeleteIcon />
                                                            </motion.button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                                {username ? (
                                                    <>
                                                        No salary structures found for user {username}. 
                                                        Click "Add Salary Structure" to create one.
                                                    </>
                                                ) : (
                                                    'No username provided in URL. Please select a staff member.'
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Table Footer */}
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-600">
                                        Total {salary.list.length} salary structure{salary.list.length !== 1 ? 's' : ''}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-xs text-gray-500">Active</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-xs text-gray-500">Scheduled</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                            <span className="text-xs text-gray-500">Expired</span>
                                        </div>
                                    </div>
                                </div>
                                {salaryData && (
                                    <span className="text-xs text-gray-500">
                                        Last updated: {new Date().toLocaleDateString('en-IN')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedSalaryDetails && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg leading-6 font-semibold text-gray-900">
                                        Salary Details - {selectedSalaryDetails.status_display}
                                    </h3>
                                    <button
                                        onClick={() => setShowDetailsModal(false)}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <CloseIcon />
                                    </button>
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Basic Information */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Basic Information</h4>
                                            <div>
                                                <p className="text-xs text-gray-500">Monthly Salary</p>
                                                <p className="text-lg font-bold text-gray-900">₹{selectedSalaryDetails.monthly_salary?.toLocaleString('en-IN')}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Status</p>
                                                <p className={`text-sm font-medium ${
                                                    selectedSalaryDetails.status === 'active' ? 'text-green-600' : 
                                                    (selectedSalaryDetails.status === 'scheduled' ? 'text-blue-600' : 'text-gray-500')
                                                }`}>
                                                    {selectedSalaryDetails.status_display}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Effective Period</p>
                                                <p className="text-sm text-gray-700">
                                                    From: {selectedSalaryDetails.effective_from_display}<br/>
                                                    To: {selectedSalaryDetails.effective_to_display || (selectedSalaryDetails.status === 'active' ? 'Present' : (selectedSalaryDetails.status === 'scheduled' ? 'Upcoming' : 'Expired'))}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Working Hours */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Working Hours</h4>
                                            <div>
                                                <p className="text-xs text-gray-500">Office Time</p>
                                                <p className="text-sm text-gray-700">
                                                    {selectedSalaryDetails.working_hours ? 
                                                        `${formatTimeTo12Hour(selectedSalaryDetails.working_hours.start)} - ${formatTimeTo12Hour(selectedSalaryDetails.working_hours.end)}` : 
                                                        '09:00 AM - 06:00 PM'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Expected Hours</p>
                                                <p className="text-sm text-gray-700">{selectedSalaryDetails.working_hours?.expected_hours || 8} hours/day</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Grace Period</p>
                                                <p className="text-sm text-gray-700">{selectedSalaryDetails.working_hours?.grace_period_minutes || 15} minutes</p>
                                            </div>
                                        </div>

                                        {/* Overtime & Fine Settings */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Overtime & Fine Settings</h4>
                                            <div>
                                                <p className="text-xs text-gray-500">Overtime</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        selectedSalaryDetails.overtime_settings?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {selectedSalaryDetails.overtime_settings?.enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                    {selectedSalaryDetails.overtime_settings?.enabled && (
                                                        <span className="text-xs text-gray-600">
                                                            Rate: {selectedSalaryDetails.overtime_settings.rate_type === 'daily' ? 'Daily (Per Minute)' : 'Monthly (Percentage)'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Fine/Deduction</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        selectedSalaryDetails.fine_settings?.enabled ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {selectedSalaryDetails.fine_settings?.enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                    {selectedSalaryDetails.fine_settings?.enabled && (
                                                        <span className="text-xs text-gray-600">
                                                            Rate: {selectedSalaryDetails.fine_settings.rate_type === 'daily' ? 'Daily (Per Minute)' : 'Monthly (Percentage)'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Break Settings */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Break Settings</h4>
                                            <div>
                                                <p className="text-xs text-gray-500">Allowed Break</p>
                                                <p className="text-sm text-gray-700">{selectedSalaryDetails.break_settings?.allowed_break_minutes || 30} minutes/day</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Break Excess Penalty</p>
                                                {selectedSalaryDetails.break_settings && selectedSalaryDetails.break_settings.excess_penalty_value > 0 ? (
                                                    <div className="mt-1">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {selectedSalaryDetails.break_settings.excess_penalty_type === 'fixed' 
                                                                ? `₹${selectedSalaryDetails.break_settings.excess_penalty_value}/minute` 
                                                                : `${selectedSalaryDetails.break_settings.excess_penalty_value}% of per-minute salary`}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500">Not set</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Travel Allowance & Other Deductions */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Travel Allowance</h4>
                                            {selectedSalaryDetails.travel_allowance && selectedSalaryDetails.travel_allowance.value > 0 ? (
                                                <>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Type</p>
                                                        <p className="text-sm font-medium text-gray-700">
                                                            {selectedSalaryDetails.travel_allowance.type === 'fixed' ? 'Fixed Amount' : 'Percentage of Salary'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Value</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {selectedSalaryDetails.travel_allowance.type === 'fixed' 
                                                                ? `₹${selectedSalaryDetails.travel_allowance.value}` 
                                                                : `${selectedSalaryDetails.travel_allowance.value}%`}
                                                        </p>
                                                    </div>
                                                    {selectedSalaryDetails.travel_allowance.amount_per_day && (
                                                        <div>
                                                            <p className="text-xs text-gray-500">Per Day Amount</p>
                                                            <p className="text-sm text-gray-700">₹{selectedSalaryDetails.travel_allowance.amount_per_day}</p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-500">No travel allowance set</p>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Other Deductions</h4>
                                            {selectedSalaryDetails.other_deductions && selectedSalaryDetails.other_deductions.value > 0 ? (
                                                <>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Type</p>
                                                        <p className="text-sm font-medium text-gray-700">
                                                            {selectedSalaryDetails.other_deductions.type === 'fixed' ? 'Fixed Amount' : 'Percentage of Salary'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Value</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {selectedSalaryDetails.other_deductions.type === 'fixed' 
                                                                ? `₹${selectedSalaryDetails.other_deductions.value}` 
                                                                : `${selectedSalaryDetails.other_deductions.value}%`}
                                                        </p>
                                                    </div>
                                                    {selectedSalaryDetails.other_deductions.amount_per_day && (
                                                        <div>
                                                            <p className="text-xs text-gray-500">Per Day Amount</p>
                                                            <p className="text-sm text-gray-700">₹{selectedSalaryDetails.other_deductions.amount_per_day}</p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-500">No other deductions set</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={() => setShowDetailsModal(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Weekly Off Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900">Weekly Off</h3>
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                            One Day Only
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                        <InfoIcon />
                        <p className="text-xs text-blue-700">
                            Only one day can be marked as weekly off. Selecting a new day will automatically replace the existing weekly off day.
                        </p>
                    </div>

                    {loadingWeeklyOff ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {weekDays.map((day) => {
                                const isPaidLeave = day === currentWeeklyOffDay;
                                
                                return (
                                    <motion.div
                                        key={day}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                                            isPaidLeave 
                                                ? 'bg-indigo-50 border border-indigo-200' 
                                                : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${isPaidLeave ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                                            <span className={`text-sm font-medium ${isPaidLeave ? 'text-indigo-700' : 'text-gray-700'}`}>
                                                {day}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs ${isPaidLeave ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                                                {isPaidLeave ? 'Weekly Off' : 'Working'}
                                            </span>
                                            <ToggleSwitch 
                                                enabled={isPaidLeave}
                                                onChange={() => handleToggle(day)}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Display current weekly off info */}
                    {currentWeeklyOffDay && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-green-800">Current Weekly Off</h4>
                                    <p className="text-xs text-green-600 mt-1">
                                        {currentWeeklyOffDay} is set as weekly off
                                    </p>
                                </div>
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                    Active
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    title="Total Structures"
                    value={salary.list.length}
                    subtitle="All salary records"
                    color="blue"
                />
                <SummaryCard
                    title="Weekly Off Day"
                    value={currentWeeklyOffDay || 'Not Set'}
                    subtitle="Current weekly off day"
                    color="green"
                />
                <SummaryCard
                    title="Active Salary"
                    value={salaryData?.current ? `₹${salaryData.current.monthly_salary.toLocaleString('en-IN')}` : 'Not Set'}
                    subtitle={salaryData?.current ? `Active from ${new Date(salaryData.current.effective_from).toLocaleDateString('en-IN')}` : 'No active salary'}
                    color="purple"
                />
            </div>
        </motion.div>
    );
};

const SummaryCard = ({ title, value, subtitle, color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all"
        >
            <h4 className="text-sm font-medium text-gray-500">{title}</h4>
            <p className={`text-2xl font-bold mt-2 ${colorClasses[color].split(' ')[1]}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </motion.div>
    );
};

export default SalaryTab;