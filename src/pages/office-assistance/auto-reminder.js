import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiSettings, FiClock, FiUsers, FiCalendar, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiX, FiSend, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import toast from 'react-hot-toast';

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
    const [initialLoading, setInitialLoading] = useState(true);
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
    const [allClients, setAllClients] = useState([]);
    const [processingGroup, setProcessingGroup] = useState(null);

    // Schedule states
    const [scheduleList, setScheduleList] = useState([]);
    const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
    const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [logs, setLogs] = useState([]);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [stats, setStats] = useState(null);

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

    // Fetch all clients for dropdown
    const fetchAllClients = async () => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/client/list?limit=100`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                const clients = result.data.data || result.data || [];
                setAllClients(clients);
            }
        } catch (error) {
            console.error("Error fetching clients:", error);
        }
    };

    // Fetch schedules from API
    const fetchSchedules = async () => {
        const headers = getHeaders();
        if (!headers) return [];

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/list?limit=100`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                const scheduleData = result.data.map(schedule => ({
                    schedule_id: schedule.group_id,
                    name: schedule.group_name,
                    type: schedule.schedule_type,
                    value_1: schedule.schedule_config?.day_of_week || schedule.schedule_config?.day_of_month || schedule.schedule_config?.time || '',
                    value_2: schedule.schedule_config?.time || '',
                    count: schedule.member_count || 0,
                    status: schedule.is_active ? '1' : '0',
                    description: schedule.description,
                    schedule_config: schedule.schedule_config
                }));
                setSchedules(scheduleData);
                setScheduleList(scheduleData);
                return scheduleData;
            }
            return [];
        } catch (error) {
            console.error("Error fetching schedules:", error);
            return [];
        }
    };

    // Fetch whitelist (group members)
    const fetchWhitelist = async (reset = false, scheduleId = '', search = '') => {
        const headers = getHeaders();
        if (!headers) return;

        if (reset) {
            setLoading(true);
            setWhitelistPage(1);
            setWhitelist([]);
        } else {
            setIsLoadingMoreWhitelist(true);
        }

        try {
            const currentScheduleId = scheduleId || searchWhitelist.schedule_id;
            const currentSearch = search || searchWhitelist.query;
            
            // First get all groups
            const groupsResponse = await fetch(`${API_BASE_URL}/autopay/group/list?limit=100`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const groupsResult = await groupsResponse.json();
            
            if (groupsResult.success) {
                let allMembers = [];
                
                for (const group of groupsResult.data) {
                    if (currentScheduleId && group.group_id !== currentScheduleId) continue;
                    
                    const membersResponse = await fetch(`${API_BASE_URL}/autopay/group/members/${group.group_id}?limit=100`, {
                        headers: { ...headers, 'Content-Type': 'application/json' }
                    });
                    const membersResult = await membersResponse.json();
                    
                    if (membersResult.success && membersResult.data) {
                        const membersWithSchedule = membersResult.data.map(member => ({
                            id: member.member_id,
                            username: member.username,
                            name: member.name,
                            guardian_name: member.guardian_name || 'N/A',
                            mobile: member.mobile,
                            email: member.email,
                            balance: member.balance || 0,
                            has_debit: member.has_debit,
                            schedule_name: group.group_name,
                            type: group.schedule_type,
                            value_1: group.schedule_config?.day_of_week || group.schedule_config?.day_of_month || group.schedule_config?.time || '',
                            value_2: group.schedule_config?.time || '',
                            group_id: group.group_id
                        }));
                        
                        // Apply search filter
                        let filtered = membersWithSchedule;
                        if (currentSearch) {
                            const searchLower = currentSearch.toLowerCase();
                            filtered = membersWithSchedule.filter(m => 
                                m.name?.toLowerCase().includes(searchLower) ||
                                m.username?.toLowerCase().includes(searchLower) ||
                                m.mobile?.includes(currentSearch)
                            );
                        }
                        
                        allMembers = [...allMembers, ...filtered];
                    }
                }
                
                // Pagination
                const page = reset ? 1 : whitelistPage;
                const limit = 10;
                const start = (page - 1) * limit;
                const paginatedMembers = allMembers.slice(start, start + limit);
                
                if (reset) {
                    setWhitelist(paginatedMembers);
                    setHasMoreWhitelist(start + limit < allMembers.length);
                } else {
                    setWhitelist(prev => [...prev, ...paginatedMembers]);
                    setHasMoreWhitelist(start + limit < allMembers.length);
                    setWhitelistPage(prev => prev + 1);
                }
            }
        } catch (error) {
            console.error("Error fetching whitelist:", error);
            toast.error("Failed to fetch whitelist data");
        } finally {
            if (reset) {
                setLoading(false);
            } else {
                setIsLoadingMoreWhitelist(false);
            }
        }
    };

    // Fetch logs
    const fetchLogs = async (groupId = null) => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            const url = groupId 
                ? `${API_BASE_URL}/autopay/logs?group_id=${groupId}&limit=20`
                : `${API_BASE_URL}/autopay/logs?limit=20`;
            const response = await fetch(url, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                setLogs(result.data);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
        }
    };

    // Fetch statistics
    const fetchStats = async () => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/stats`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                setStats(result.data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    // Process group manually
    const processGroup = async (groupId, groupName) => {
        const headers = getHeaders();
        if (!headers) return;

        setProcessingGroup(groupId);
        const toastId = toast.loading(`Processing ${groupName}...`);
        
        try {
            const response = await fetch(`${API_BASE_URL}/autopay/process/group/${groupId}`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success(`${groupName} processed successfully! Sent: ${result.data.sent}, Skipped: ${result.data.skipped}, Failed: ${result.data.failed}`, {
                    id: toastId,
                    duration: 5000
                });
                fetchLogs(groupId);
                fetchStats();
            } else {
                toast.error(result.message || "Processing failed", { id: toastId });
            }
        } catch (error) {
            console.error("Error processing group:", error);
            toast.error("Failed to process group", { id: toastId });
        } finally {
            setProcessingGroup(null);
        }
    };

    // Process all groups
    const processAllGroups = async () => {
        const headers = getHeaders();
        if (!headers) return;

        const toastId = toast.loading("Processing all autopay groups...");
        
        try {
            const response = await fetch(`${API_BASE_URL}/autopay/process/all`, {
                method: 'GET',
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success("All groups processed successfully!", { id: toastId });
                fetchWhitelist(true);
                fetchLogs();
                fetchStats();
            } else {
                toast.error(result.message || "Processing failed", { id: toastId });
            }
        } catch (error) {
            console.error("Error processing groups:", error);
            toast.error("Failed to process groups", { id: toastId });
        }
    };

    // Create schedule (group)
    const createSchedule = async (formData) => {
        const headers = getHeaders();
        if (!headers) return;

        let scheduleConfig = {};
        if (formData.type === 'daily') {
            scheduleConfig = { time: formData.hour };
            if (formData.day) {
                const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
                scheduleConfig.days = [dayMap[formData.day]];
            }
        } else if (formData.type === 'weekly') {
            const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
            scheduleConfig = {
                day_of_week: dayMap[formData.day],
                time: formData.hour
            };
        } else if (formData.type === 'monthly') {
            scheduleConfig = {
                day_of_month: formData.date === 'last day' ? null : parseInt(formData.date),
                last_day_of_month: formData.date === 'last day',
                time: formData.hour
            };
        }

        const payload = {
            group_name: formData.name,
            description: `${formData.type} reminder schedule`,
            schedule_type: formData.type,
            schedule_config: scheduleConfig,
            is_active: 1
        };

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/create`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success("Schedule created successfully!");
                await fetchSchedules();
                return true;
            } else {
                toast.error(result.message || "Failed to create schedule");
                return false;
            }
        } catch (error) {
            console.error("Error creating schedule:", error);
            toast.error("Failed to create schedule");
            return false;
        }
    };

    // Update schedule
    const updateSchedule = async (formData) => {
        const headers = getHeaders();
        if (!headers) return;

        let scheduleConfig = {};
        if (formData.type === 'daily') {
            scheduleConfig = { time: formData.hour };
            if (formData.day) {
                const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
                scheduleConfig.days = [dayMap[formData.day]];
            }
        } else if (formData.type === 'weekly') {
            const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
            scheduleConfig = {
                day_of_week: dayMap[formData.day],
                time: formData.hour
            };
        } else if (formData.type === 'monthly') {
            scheduleConfig = {
                day_of_month: formData.date === 'last day' ? null : parseInt(formData.date),
                last_day_of_month: formData.date === 'last day',
                time: formData.hour
            };
        }

        const payload = {
            group_id: formData.schedule_id,
            group_name: formData.name,
            description: `${formData.type} reminder schedule`,
            schedule_type: formData.type,
            schedule_config: scheduleConfig,
            is_active: parseInt(formData.status)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/update`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success("Schedule updated successfully!");
                await fetchSchedules();
                return true;
            } else {
                toast.error(result.message || "Failed to update schedule");
                return false;
            }
        } catch (error) {
            console.error("Error updating schedule:", error);
            toast.error("Failed to update schedule");
            return false;
        }
    };

    // Delete schedule
    const deleteSchedule = async (scheduleId) => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/delete/${scheduleId}`, {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success("Schedule deleted successfully!");
                await fetchSchedules();
                return true;
            } else {
                toast.error(result.message || "Failed to delete schedule");
                return false;
            }
        } catch (error) {
            console.error("Error deleting schedule:", error);
            toast.error("Failed to delete schedule");
            return false;
        }
    };

    // Add members to group
    const addMembersToGroup = async (groupId, usernames) => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/add-members`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: groupId, usernames })
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success(`${result.data.added} clients added to schedule!`);
                return true;
            } else {
                toast.error(result.message || "Failed to add clients");
                return false;
            }
        } catch (error) {
            console.error("Error adding members:", error);
            toast.error("Failed to add clients");
            return false;
        }
    };

    // Remove member from group
    const removeMember = async (groupId, username) => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/remove-members`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: groupId, usernames: [username] })
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success("Client removed successfully!");
                fetchWhitelist(true);
                return true;
            } else {
                toast.error(result.message || "Failed to remove client");
                return false;
            }
        } catch (error) {
            console.error("Error removing member:", error);
            toast.error("Failed to remove client");
            return false;
        }
    };

    // View logs for schedule
    const viewScheduleLogs = async (groupId, groupName) => {
        await fetchLogs(groupId);
        setShowLogsModal(true);
    };

    // Initial data load
    useEffect(() => {
        const loadInitialData = async () => {
            setInitialLoading(true);
            await fetchSchedules();
            await fetchWhitelist(true);
            await fetchStats();
            await fetchAllClients();
            setInitialLoading(false);
        };
        loadInitialData();
    }, []);

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
            if (entries[0].isIntersecting && hasMoreWhitelist && !loading) {
                fetchWhitelist(false);
            }
        });

        if (node) observer.current.observe(node);
    }, [isLoadingMoreWhitelist, hasMoreWhitelist, loading]);

    // Whitelist functions
    const handleWhitelistSearch = (e) => {
        e.preventDefault();
        fetchWhitelist(true);
    };

    const handleWhitelistSubmit = async (e) => {
        e.preventDefault();
        if (!whitelistForm.schedule_id) {
            toast.error("Please select a schedule");
            return;
        }
        if (whitelistForm.usernames.length === 0) {
            toast.error("Please select at least one client");
            return;
        }
        
        const success = await addMembersToGroup(whitelistForm.schedule_id, whitelistForm.usernames);
        if (success) {
            setShowCreateWhitelistModal(false);
            resetWhitelistForm();
            fetchWhitelist(true);
            fetchSchedules();
        }
    };

    const handleDeleteWhitelist = async (item) => {
        const success = await removeMember(item.group_id, item.username);
        if (success) {
            fetchWhitelist(true);
            fetchSchedules();
        }
    };

    // Schedule functions
    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        const success = await createSchedule(scheduleForm);
        if (success) {
            setShowCreateScheduleModal(false);
            resetScheduleForm();
            fetchWhitelist(true);
        }
    };

    const handleEditScheduleSubmit = async (e) => {
        e.preventDefault();
        const success = await updateSchedule(editScheduleForm);
        if (success) {
            setShowEditScheduleModal(false);
            fetchWhitelist(true);
        }
    };

    const handleEditScheduleClick = (schedule) => {
        setSelectedSchedule(schedule);
        setEditScheduleForm({
            schedule_id: schedule.schedule_id,
            name: schedule.name,
            type: schedule.type,
            day: schedule.type === 'weekly' ? getDayName(schedule.value_1) : '',
            date: schedule.type === 'monthly' ? schedule.value_1 : '',
            hour: schedule.type === 'daily' ? schedule.value_1 : schedule.value_2,
            status: schedule.status
        });
        setShowEditScheduleModal(true);
    };

    const handleDeleteSchedule = async (scheduleId) => {
        if (window.confirm("Are you sure you want to delete this schedule? This will also remove all clients from this schedule.")) {
            await deleteSchedule(scheduleId);
            fetchWhitelist(true);
        }
    };

    const getDayName = (dayValue) => {
        const dayMap = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 0: 'Sunday' };
        return dayMap[parseInt(dayValue)] || '';
    };

    // Helper functions
    const handleShowScheduleValues = (type, value_1, value_2) => {
        if (type === 'daily') {
            return `Daily at ${formatHour(value_1)}`;
        } else if (type === 'weekly') {
            return `Every ${getDayName(value_1)} at ${formatHour(value_2)}`;
        } else if (type === 'monthly') {
            const day = value_1 === 'last day' ? 'last day' : `${value_1} day`;
            return `Every ${day} of month at ${formatHour(value_2)}`;
        }
        return `Invalid Type`;
    };

    const formatHour = (hour) => {
        const hourNum = parseInt(hour);
        if (isNaN(hourNum)) return hour;
        if (hourNum === 0) return '12:00 AM';
        if (hourNum === 12) return '12:00 PM';
        if (hourNum < 12) return `${hourNum}:00 AM`;
        return `${hourNum - 12}:00 PM`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Math.abs(amount));
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

    // Stats Cards Component
    const StatsCards = () => {
        if (!stats) return null;
        
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Groups</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.groups?.total || 0}</p>
                        </div>
                        <div className="p-3 bg-indigo-100 rounded-lg">
                            <FiCalendar className="w-5 h-5 text-indigo-600" />
                        </div>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs">
                        <span className="text-green-600">Active: {stats.groups?.active || 0}</span>
                        <span className="text-red-600">Inactive: {stats.groups?.inactive || 0}</span>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Clients</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.members?.total || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <FiUsers className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Across {stats.members?.groups_with_members || 0} groups</p>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Today's Sent</p>
                            <p className="text-2xl font-bold text-green-600">{stats.today_runs?.total_sent || 0}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <FiSend className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs">
                        <span>Skipped: {stats.today_runs?.total_skipped || 0}</span>
                        <span>Failed: {stats.today_runs?.total_failed || 0}</span>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Scheduled Today</p>
                            <p className="text-2xl font-bold text-orange-600">{stats.scheduled_today?.length || 0}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <FiClock className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                    <button
                        onClick={processAllGroups}
                        className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                        <FiRefreshCw className="w-3 h-3" />
                        Run All Now
                    </button>
                </div>
            </div>
        );
    };

    // Loading Skeleton
    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
                        </div>
                        <div className="h-12 bg-gray-200 rounded-lg mb-6"></div>
                        <div className="h-96 bg-gray-200 rounded-xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (initialLoading) return <SkeletonLoader />;

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
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Auto Reminder System</h1>
                        <p className="text-gray-600 text-sm">Automated payment reminders for clients with debit balance</p>
                    </div>

                    {/* Stats Cards */}
                    <StatsCards />

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
                        {activeTab === 'whitelist' ? (
                            <motion.div 
                                key="whitelist"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                            >
                                {/* Header Section */}
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 px-6 py-5">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
                                                <FiUsers className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h5 className="text-lg font-bold text-gray-900">Reminder Whitelist</h5>
                                                <p className="text-sm text-gray-600">Clients who will receive automated reminders</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                                            <form onSubmit={handleWhitelistSearch} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                                <div className="relative flex-1 sm:flex-none">
                                                    <select
                                                        value={searchWhitelist.schedule_id}
                                                        onChange={(e) => handleSearchWhitelistChange('schedule_id', e.target.value)}
                                                        className="w-full sm:w-48 pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none text-sm"
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
                                                
                                                <div className="relative flex-1 sm:flex-none">
                                                    <input
                                                        type="text"
                                                        value={searchWhitelist.query}
                                                        onChange={(e) => handleSearchWhitelistChange('query', e.target.value)}
                                                        className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none text-sm"
                                                        placeholder="Search by name, mobile, username..."
                                                    />
                                                    <FiSearch className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                </div>
                                                
                                                <button type="submit" className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center justify-center gap-2">
                                                    <FiSearch className="w-4 h-4" />
                                                    Search
                                                </button>
                                            </form>
                                            
                                            <button
                                                onClick={() => setShowCreateWhitelistModal(true)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Add Client
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Section */}
                                <div className="p-6">
                                    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                                    <th className="text-center p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider w-16">#</th>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[200px]">Client Details</th>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[180px]">Contact Info</th>
                                                    <th className="text-right p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[120px]">Balance</th>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[200px]">Schedule</th>
                                                    <th className="text-center p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider w-32">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading && whitelist.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center p-8">
                                                            <div className="flex justify-center items-center">
                                                                <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent"></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : whitelist.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center p-8">
                                                            <div className="flex flex-col items-center justify-center py-6">
                                                                <div className="p-3 bg-gray-100 rounded-full mb-3">
                                                                    <FiUsers className="w-6 h-6 text-gray-400" />
                                                                </div>
                                                                <h3 className="text-base font-semibold text-gray-700 mb-1">No clients found</h3>
                                                                <p className="text-gray-500 text-sm">Add clients to start sending automated reminders</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    whitelist.map((item, index) => (
                                                        <motion.tr
                                                            key={item.id}
                                                            ref={index === whitelist.length - 1 ? lastWhitelistElementRef : null}
                                                            className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 transition-all"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                                        >
                                                            <td className="text-center p-4">
                                                                <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-md font-semibold">
                                                                    {index + 1}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <a href={`/view-client-profile?username=${item.username}`} className="group block hover:no-underline">
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="flex-shrink-0 p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                                                                            <FiUsers className="w-4 h-4 text-indigo-600" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 truncate">
                                                                                {item.name}
                                                                            </h4>
                                                                            <p className="text-sm text-gray-600 mt-0.5 truncate">
                                                                                @{item.username}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </a>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="space-y-1">
                                                                    <div className="text-gray-900 font-medium truncate">{item.mobile}</div>
                                                                    <div className="text-sm text-gray-600 truncate max-w-[200px]">{item.email}</div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${item.balance >= 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                                    ₹{formatCurrency(item.balance)}
                                                                    {item.has_debit && <span className="ml-1 text-xs">(Debit)</span>}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="space-y-1.5">
                                                                    <span className="inline-block px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg font-medium text-sm">
                                                                        {item.schedule_name}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5 text-sm text-indigo-600">
                                                                        <FiClock className="w-3.5 h-3.5 flex-shrink-0" />
                                                                        <span className="truncate">
                                                                            {handleShowScheduleValues(item.type, item.value_1, item.value_2)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-center p-4">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => processGroup(item.group_id, item.schedule_name)}
                                                                        disabled={processingGroup === item.group_id}
                                                                        className="p-2 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-all"
                                                                        title="Run Now"
                                                                    >
                                                                        {processingGroup === item.group_id ? (
                                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                                                        ) : (
                                                                            <FiSend className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteWhitelist(item)}
                                                                        className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-all"
                                                                    >
                                                                        <FiTrash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {isLoadingMoreWhitelist && (
                                        <div className="flex justify-center py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                                                <span className="text-gray-600 text-sm">Loading more clients...</span>
                                            </div>
                                        </div>
                                    )}

                                    {!hasMoreWhitelist && whitelist.length > 0 && (
                                        <div className="flex justify-center py-4">
                                            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                                                <FiCheckCircle className="w-4 h-4 text-green-500" />
                                                <span className="text-gray-600 text-sm">All clients loaded</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="schedule"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
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
                                                <h5 className="text-lg font-bold text-gray-900">Reminder Schedules</h5>
                                                <p className="text-sm text-gray-600">Configure when reminders are sent</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => fetchSchedules()}
                                                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2"
                                            >
                                                <FiRefreshCw className="w-4 h-4" />
                                                Refresh
                                            </button>
                                            <button
                                                onClick={() => setShowCreateScheduleModal(true)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Create Schedule
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {scheduleList.length === 0 ? (
                                            <div className="col-span-full">
                                                <div className="flex flex-col items-center justify-center py-12">
                                                    <div className="p-3 bg-gray-100 rounded-full mb-3">
                                                        <FiCalendar className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No schedules found</h3>
                                                    <p className="text-gray-500 text-sm mb-4">Create your first reminder schedule</p>
                                                    <button
                                                        onClick={() => setShowCreateScheduleModal(true)}
                                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-medium"
                                                    >
                                                        Create Schedule
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            scheduleList.map((schedule, index) => (
                                                <motion.div
                                                    key={schedule.schedule_id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                                    className={`rounded-xl border p-6 transition-all duration-300 hover:shadow-lg ${
                                                        schedule.status === '1' 
                                                            ? 'border-blue-200 bg-gradient-to-br from-white to-blue-50/30 hover:border-blue-300' 
                                                            : 'border-gray-200 bg-gradient-to-br from-white to-gray-50/30 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 text-lg mb-1">{schedule.name}</h3>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                                    schedule.type === 'daily' ? 'bg-blue-100 text-blue-700' : 
                                                                    schedule.type === 'weekly' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                    {schedule.type.toUpperCase()}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                                    schedule.status === '1' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                    {schedule.status === '1' ? 'ACTIVE' : 'INACTIVE'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                                                            <FiClock className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 mb-4">
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                            <FiCalendar className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="font-medium">
                                                                {handleShowScheduleValues(schedule.type, schedule.value_1, schedule.value_2)}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-sm text-gray-500">Assigned Clients</div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                                                    {schedule.count}
                                                                </div>
                                                                <span className="text-sm font-semibold text-gray-700">{schedule.count} clients</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between pt-4 border-t border-gray-100">
                                                        <button
                                                            onClick={() => processGroup(schedule.schedule_id, schedule.name)}
                                                            disabled={processingGroup === schedule.schedule_id}
                                                            className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all"
                                                        >
                                                            {processingGroup === schedule.schedule_id ? (
                                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent"></div>
                                                            ) : (
                                                                <FiSend className="w-3.5 h-3.5" />
                                                            )}
                                                            Run Now
                                                        </button>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => viewScheduleLogs(schedule.schedule_id, schedule.name)}
                                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all"
                                                            >
                                                                <FiClock className="w-3.5 h-3.5" />
                                                                Logs
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditScheduleClick(schedule)}
                                                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all"
                                                            >
                                                                <FiEdit className="w-3.5 h-3.5" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSchedule(schedule.schedule_id)}
                                                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all"
                                                            >
                                                                <FiTrash2 className="w-3.5 h-3.5" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

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
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-t-2xl sticky top-0">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/20 rounded-md">
                                            <FiUsers className="w-5 h-5 text-white" />
                                        </div>
                                        <h5 className="text-lg font-bold text-white">Add Clients to Autopay</h5>
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
                                                Select Clients <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                multiple
                                                value={whitelistForm.usernames}
                                                onChange={(e) => handleWhitelistChange('usernames', Array.from(e.target.selectedOptions, option => option.value))}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none h-60 shadow-inner"
                                                required
                                            >
                                                {allClients.map(client => (
                                                    <option key={client.username} value={client.username} className="px-2 py-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-medium">{client.name || client.username}</span>
                                                            <span className="text-sm text-gray-500">📱 {client.mobile}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-400">@{client.username}</div>
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
                                                    Schedule <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={whitelistForm.schedule_id}
                                                        onChange={(e) => handleWhitelistChange('schedule_id', e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none appearance-none"
                                                        required
                                                    >
                                                        <option value="">Select Schedule</option>
                                                        {schedules.map(schedule => (
                                                            <option key={schedule.schedule_id} value={schedule.schedule_id}>
                                                                {schedule.name} ({schedule.type})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-3.5 pointer-events-none">
                                                        <FiCalendar className="w-4 h-4 text-gray-400" />
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
                                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 outline-none font-medium text-gray-700"
                                                        placeholder="Schedule details will appear here"
                                                    />
                                                    <FiClock className="absolute right-4 top-3.5 w-4 h-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateWhitelistModal(false)}
                                            className="px-5 py-2.5 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium shadow"
                                        >
                                            Add to Autopay
                                        </button>
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
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4 rounded-t-2xl sticky top-0">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/20 rounded-md">
                                            <FiCalendar className="w-5 h-5 text-white" />
                                        </div>
                                        <h5 className="text-lg font-bold text-white">Create Schedule</h5>
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
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Schedule Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={scheduleForm.name}
                                                onChange={(e) => handleScheduleChange('name', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
                                                placeholder="e.g., Morning Payment Reminder"
                                                required
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Schedule Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={scheduleForm.type}
                                                onChange={(e) => handleScheduleChange('type', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
                                                required
                                            >
                                                <option value="">Select Type</option>
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                        
                                        {scheduleForm.type === 'weekly' && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Day of Week <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={scheduleForm.day}
                                                    onChange={(e) => handleScheduleChange('day', e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
                                                    required
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
                                        )}
                                        
                                        {scheduleForm.type === 'monthly' && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Day of Month <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={scheduleForm.date}
                                                    onChange={(e) => handleScheduleChange('date', e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
                                                    required
                                                >
                                                    <option value="">Select Date</option>
                                                    {Array.from({ length: 31 }, (_, i) => (
                                                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                            {i + 1}{i + 1 === 1 ? 'st' : i + 1 === 2 ? 'nd' : i + 1 === 3 ? 'rd' : 'th'} day
                                                        </option>
                                                    ))}
                                                    <option value="last day">Last day of Month</option>
                                                </select>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Time <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={scheduleForm.hour}
                                                onChange={(e) => handleScheduleChange('hour', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
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
                                    </div>
                                    
                                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateScheduleModal(false)}
                                            className="px-5 py-2.5 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 font-medium shadow"
                                        >
                                            Create Schedule
                                        </button>
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
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-t-2xl sticky top-0">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/20 rounded-md">
                                            <FiEdit className="w-5 h-5 text-white" />
                                        </div>
                                        <h5 className="text-lg font-bold text-white">Edit Schedule</h5>
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Schedule Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editScheduleForm.name}
                                                onChange={(e) => handleEditScheduleChange('name', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
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
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                required
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                        
                                        {editScheduleForm.type === 'weekly' && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Day of Week
                                                </label>
                                                <select
                                                    value={editScheduleForm.day}
                                                    onChange={(e) => handleEditScheduleChange('day', e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                    required
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
                                        )}
                                        
                                        {editScheduleForm.type === 'monthly' && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Day of Month
                                                </label>
                                                <select
                                                    value={editScheduleForm.date}
                                                    onChange={(e) => handleEditScheduleChange('date', e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                    required
                                                >
                                                    <option value="">Select Date</option>
                                                    {Array.from({ length: 31 }, (_, i) => (
                                                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                            {i + 1}{i + 1 === 1 ? 'st' : i + 1 === 2 ? 'nd' : i + 1 === 3 ? 'rd' : 'th'} day
                                                        </option>
                                                    ))}
                                                    <option value="last day">Last day of Month</option>
                                                </select>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Time
                                            </label>
                                            <select
                                                value={editScheduleForm.hour}
                                                onChange={(e) => handleEditScheduleChange('hour', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
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
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                                                required
                                            >
                                                <option value="1">Active</option>
                                                <option value="0">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setShowEditScheduleModal(false)}
                                            className="px-5 py-2.5 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium shadow"
                                        >
                                            Update Schedule
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Logs Modal */}
            <AnimatePresence>
                {showLogsModal && (
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
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4 rounded-t-2xl sticky top-0">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/20 rounded-md">
                                            <FiClock className="w-5 h-5 text-white" />
                                        </div>
                                        <h5 className="text-lg font-bold text-white">Schedule Logs</h5>
                                    </div>
                                    <button
                                        onClick={() => setShowLogsModal(false)}
                                        className="text-white/80 hover:text-white text-2xl transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                {logs.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FiAlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No logs found for this schedule</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {logs.map((log, idx) => (
                                            <div key={log.log_id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                                            log.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                            log.status === 'skipped' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {log.status === 'completed' && <FiCheckCircle className="w-3 h-3" />}
                                                            {log.status === 'failed' && <FiAlertCircle className="w-3 h-3" />}
                                                            {log.status === 'skipped' && <FiClock className="w-3 h-3" />}
                                                            {log.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(log.run_date).toLocaleString()}
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-4 mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Sent</p>
                                                        <p className="text-lg font-bold text-green-600">{log.sent_count || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Skipped</p>
                                                        <p className="text-lg font-bold text-yellow-600">{log.skipped_count || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Failed</p>
                                                        <p className="text-lg font-bold text-red-600">{log.failed_count || 0}</p>
                                                    </div>
                                                </div>
                                                
                                                {log.message && (
                                                    <p className="text-sm text-gray-600 mt-2">{log.message}</p>
                                                )}
                                                {log.error_message && (
                                                    <p className="text-sm text-red-600 mt-2">Error: {log.error_message}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AutoReminder;