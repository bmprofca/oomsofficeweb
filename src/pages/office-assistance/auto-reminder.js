import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiSettings, FiClock, FiUsers, FiCalendar, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiX, FiSend, FiLoader, FiUser, FiPhone, FiMail, FiDollarSign } from 'react-icons/fi';
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
    const [searchWhitelist, setSearchWhitelist] = useState({
        schedule_id: '',
        query: ''
    });
    const [allClients, setAllClients] = useState([]);
    const [processingGroup, setProcessingGroup] = useState(null);
    const [selectedClientsForModal, setSelectedClientsForModal] = useState([]);

    // Schedule states
    const [scheduleList, setScheduleList] = useState([]);
    const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
    const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [logs, setLogs] = useState([]);
    const [showLogsModal, setShowLogsModal] = useState(false);
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
        hour: '',
        minute: '00'
    });

    const [editScheduleForm, setEditScheduleForm] = useState({
        schedule_id: '',
        name: '',
        type: '',
        day: '',
        date: '',
        hour: '',
        minute: '00',
        status: '1'
    });

    // Fetch all clients for dropdown
    const fetchAllClients = async () => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/client/list?limit=500`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                const clientsData = result.data.data || result.data || [];
                const formattedClients = clientsData.map(client => ({
                    username: client.username || client.profile_id,
                    name: client.name || client.full_name || client.client_name || 'N/A',
                    mobile: client.mobile || client.phone || 'N/A',
                    email: client.email || 'N/A',
                    firm_name: client.firms?.[0]?.firm_name || 'Individual'
                }));
                setAllClients(formattedClients);
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
                    schedule_config: schedule.schedule_config,
                    schedule_display: schedule.schedule_display || getScheduleDisplay(schedule.schedule_type, schedule.schedule_config),
                    count: schedule.member_count || 0,
                    status: schedule.is_active ? '1' : '0',
                    description: schedule.description
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

    const getScheduleDisplay = (type, config) => {
        if (!config) return '';
        if (type === 'daily') {
            if (config.days?.length && config.days.length < 7) {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const days = config.days.map(d => dayNames[d === 7 ? 0 : d]);
                return `Every ${days.join(', ')} at ${config.time}`;
            }
            return `Every day at ${config.time}`;
        } else if (type === 'weekly') {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const day = dayNames[config.day_of_week === 7 ? 0 : config.day_of_week];
            return `Every ${day} at ${config.time}`;
        } else if (type === 'monthly') {
            if (config.day_of_month) {
                return `Every ${config.day_of_month}${getOrdinalSuffix(config.day_of_month)} of month at ${config.time}`;
            } else if (config.week_of_month && config.day_of_week) {
                const weekNames = ['First', 'Second', 'Third', 'Fourth'];
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const weekText = config.week_of_month === 'last' ? 'Last' : weekNames[config.week_of_month - 1];
                return `${weekText} ${dayNames[config.day_of_week]} of month at ${config.time}`;
            } else if (config.last_day_of_month) {
                return `Last day of month at ${config.time}`;
            }
        }
        return '';
    };

    const getOrdinalSuffix = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
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
                            name: member.name || member.username,
                            mobile: member.mobile || 'N/A',
                            email: member.email || 'N/A',
                            balance: member.balance || 0,
                            has_debit: member.has_debit,
                            schedule_name: group.group_name,
                            type: group.schedule_type,
                            schedule_display: getScheduleDisplay(group.schedule_type, group.schedule_config),
                            group_id: group.group_id
                        }));
                        
                        let filtered = membersWithSchedule;
                        if (currentSearch) {
                            const searchLower = currentSearch.toLowerCase();
                            filtered = membersWithSchedule.filter(m => 
                                m.name?.toLowerCase().includes(searchLower) ||
                                m.mobile?.includes(currentSearch) ||
                                m.email?.toLowerCase().includes(searchLower)
                            );
                        }
                        
                        allMembers = [...allMembers, ...filtered];
                    }
                }
                
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
                toast.success(`${groupName} completed! 📧 Sent: ${result.data.sent} | ⏭️ Skipped: ${result.data.skipped} | ❌ Failed: ${result.data.failed}`, {
                    id: toastId,
                    duration: 5000
                });
                fetchLogs(groupId);
                fetchStats();
                fetchWhitelist(true);
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

        const toastId = toast.loading("Processing all schedules...");
        
        try {
            const response = await fetch(`${API_BASE_URL}/autopay/process/all`, {
                method: 'GET',
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success("All schedules processed successfully!", { id: toastId });
                fetchWhitelist(true);
                fetchLogs();
                fetchStats();
            } else {
                toast.error(result.message || "Processing failed", { id: toastId });
            }
        } catch (error) {
            console.error("Error processing groups:", error);
            toast.error("Failed to process schedules", { id: toastId });
        }
    };

    // Create schedule
    const createSchedule = async (formData) => {
        const headers = getHeaders();
        if (!headers) return false;

        const timeString = `${formData.hour}:${formData.minute || '00'}`;
        let scheduleConfig = {};
        
        if (formData.type === 'daily') {
            scheduleConfig = { time: timeString };
        } else if (formData.type === 'weekly') {
            const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
            scheduleConfig = {
                day_of_week: dayMap[formData.day],
                time: timeString
            };
        } else if (formData.type === 'monthly') {
            if (formData.date === 'last day') {
                scheduleConfig = {
                    last_day_of_month: true,
                    time: timeString
                };
            } else {
                scheduleConfig = {
                    day_of_month: parseInt(formData.date),
                    time: timeString
                };
            }
        }

        const payload = {
            group_name: formData.name,
            description: `${formData.type} payment reminder schedule`,
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
        if (!headers) return false;

        const timeString = `${formData.hour}:${formData.minute || '00'}`;
        let scheduleConfig = {};
        
        if (formData.type === 'daily') {
            scheduleConfig = { time: timeString };
        } else if (formData.type === 'weekly') {
            const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
            scheduleConfig = {
                day_of_week: dayMap[formData.day],
                time: timeString
            };
        } else if (formData.type === 'monthly') {
            if (formData.date === 'last day') {
                scheduleConfig = {
                    last_day_of_month: true,
                    time: timeString
                };
            } else {
                scheduleConfig = {
                    day_of_month: parseInt(formData.date),
                    time: timeString
                };
            }
        }

        const payload = {
            group_id: formData.schedule_id,
            group_name: formData.name,
            description: `${formData.type} payment reminder schedule`,
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
        if (!headers) return false;

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
        if (!headers) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/add-members`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: groupId, usernames })
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success(`${result.data.added} client(s) added to schedule!`);
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
    const removeMember = async (groupId, username, clientName) => {
        const headers = getHeaders();
        if (!headers) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/remove-members`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: groupId, usernames: [username] })
            });
            const result = await response.json();
            
            if (result.success) {
                toast.success(`${clientName} removed from schedule`);
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

    // Last element observer for infinite scroll
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
        const success = await removeMember(item.group_id, item.username, item.name);
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
        const config = schedule.schedule_config || {};
        let hour = '', minute = '', day = '', date = '';
        
        if (config.time) {
            [hour, minute] = config.time.split(':');
        }
        
        if (schedule.type === 'weekly' && config.day_of_week !== undefined) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            day = dayNames[config.day_of_week === 7 ? 0 : config.day_of_week];
        }
        
        if (schedule.type === 'monthly' && config.day_of_month) {
            date = String(config.day_of_month);
        }
        if (schedule.type === 'monthly' && config.last_day_of_month) {
            date = 'last day';
        }
        
        setEditScheduleForm({
            schedule_id: schedule.schedule_id,
            name: schedule.name,
            type: schedule.type,
            day: day,
            date: date,
            hour: hour || '09',
            minute: minute || '00',
            status: schedule.status
        });
        setShowEditScheduleModal(true);
    };

    const handleDeleteSchedule = async (scheduleId, scheduleName) => {
        if (window.confirm(`Are you sure you want to delete "${scheduleName}"? This will remove all clients from this schedule.`)) {
            await deleteSchedule(scheduleId);
            fetchWhitelist(true);
        }
    };

    const handleViewLogs = async (groupId, groupName) => {
        await fetchLogs(groupId);
        setShowLogsModal(true);
    };

    // Helper functions
    const formatTime = (hour, minute = '00') => {
        const h = parseInt(hour);
        const m = minute;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
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
                newForm.show_schedule = selectedSchedule.schedule_display;
            } else {
                newForm.show_schedule = '';
            }
        }
        
        setWhitelistForm(newForm);
    };

    const handleClientSelection = (username) => {
        setSelectedClientsForModal(prev => {
            if (prev.includes(username)) {
                return prev.filter(u => u !== username);
            } else {
                return [...prev, username];
            }
        });
        setWhitelistForm(prev => ({
            ...prev,
            usernames: selectedClientsForModal.includes(username) 
                ? prev.usernames.filter(u => u !== username)
                : [...prev.usernames, username]
        }));
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

    const resetWhitelistForm = () => {
        setWhitelistForm({
            usernames: [],
            schedule_id: '',
            show_schedule: ''
        });
        setSelectedClientsForModal([]);
    };

    const resetScheduleForm = () => {
        setScheduleForm({
            name: '',
            type: '',
            day: '',
            date: '',
            hour: '',
            minute: '00'
        });
    };

    // Stats Cards Component
    const StatsCards = () => {
        if (!stats) return null;
        
        const cards = [
            {
                title: 'Active Schedules',
                value: stats.groups?.active || 0,
                icon: <FiCalendar className="w-4 h-4" />,
                color: 'indigo',
                subText: `${stats.groups?.inactive || 0} inactive`
            },
            {
                title: 'Clients Enrolled',
                value: stats.members?.total || 0,
                icon: <FiUsers className="w-4 h-4" />,
                color: 'purple',
                subText: `Across ${stats.members?.groups_with_members || 0} schedules`
            },
            {
                title: "Today's Sent",
                value: stats.today_runs?.total_sent || 0,
                icon: <FiSend className="w-4 h-4" />,
                color: 'emerald',
                subText: `Skipped: ${stats.today_runs?.total_skipped || 0} | Failed: ${stats.today_runs?.total_failed || 0}`
            }
        ];

        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {cards.map((card, idx) => {
                    const colorStyles = {
                        indigo: 'bg-indigo-50/80 text-indigo-600 border-indigo-100',
                        purple: 'bg-purple-50/80 text-purple-600 border-purple-100',
                        emerald: 'bg-emerald-50/80 text-emerald-600 border-emerald-100'
                    };
                    const selectedStyle = colorStyles[card.color] || 'bg-gray-50 text-gray-600 border-gray-100';

                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4"
                        >
                            <div className={`p-3 rounded-lg border ${selectedStyle} flex-shrink-0 flex items-center justify-center`}>
                                {card.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                    {card.title}
                                </span>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                    <span className="text-xl font-bold text-gray-800 leading-tight">
                                        {card.value}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500 mt-1 block truncate" title={card.subText}>
                                    {card.subText}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    // Loading Skeleton
    const SkeletonLoader = () => (
        <div className="min-h-screen bg-gray-50">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            {[1,2,3].map(i => <div key={i} className="h-[88px] bg-gray-200 rounded-xl"></div>)}
                        </div>
                        <div className="h-12 bg-gray-200 rounded-lg mb-6 w-48"></div>
                        <div className="h-96 bg-gray-200 rounded-xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (initialLoading) return <SkeletonLoader />;

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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Auto Reminder System</h1>
                        <p className="text-gray-500 text-sm mt-1">Automated payment reminders for clients with debit balance</p>
                    </div>

                    {/* Stats Cards */}
                    <StatsCards />

                    {/* Tabs */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="bg-gray-100 p-1 rounded-lg inline-flex self-start border border-gray-200/50">
                            <button
                                onClick={() => setActiveTab('whitelist')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                                    activeTab === 'whitelist'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <FiUsers className="w-3.5 h-3.5" />
                                Enrolled Clients
                                {whitelist.length > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${
                                        activeTab === 'whitelist' 
                                            ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-100' 
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {whitelist.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                                    activeTab === 'schedule'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <FiCalendar className="w-3.5 h-3.5" />
                                Schedules
                                {scheduleList.length > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${
                                        activeTab === 'schedule' 
                                            ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-100' 
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {scheduleList.length}
                                    </span>
                                )}
                            </button>
                        </div>
                        
                        {activeTab === 'schedule' && (
                            <button
                                onClick={() => setShowCreateScheduleModal(true)}
                                className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-sm self-start sm:self-center"
                            >
                                <FiPlus className="w-3.5 h-3.5" />
                                Create Schedule
                            </button>
                        )}
                    </div>

                    {/* Whitelist Tab */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'whitelist' ? (
                            <motion.div
                                key="whitelist"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                            >
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">Enrolled Clients</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">Clients who will receive automated reminders</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <form onSubmit={handleWhitelistSearch} className="flex items-center gap-2">
                                                <select
                                                    value={searchWhitelist.schedule_id}
                                                    onChange={(e) => handleSearchWhitelistChange('schedule_id', e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                                >
                                                    <option value="">All Schedules</option>
                                                    {schedules.map(s => (
                                                        <option key={s.schedule_id} value={s.schedule_id}>{s.name}</option>
                                                    ))}
                                                </select>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={searchWhitelist.query}
                                                        onChange={(e) => handleSearchWhitelistChange('query', e.target.value)}
                                                        placeholder="Search by name or mobile..."
                                                        className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                    <FiSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                </div>
                                                <button type="submit" className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                                                    Search
                                                </button>
                                            </form>
                                            <button
                                                onClick={() => setShowCreateWhitelistModal(true)}
                                                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
                                            >
                                                <FiPlus className="w-4 h-4" />
                                                Add Client
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule</th>
                                                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loading && whitelist.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : whitelist.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                                <FiUsers className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                            <p className="text-gray-500 font-medium">No clients enrolled</p>
                                                            <p className="text-sm text-gray-400 mt-1">Add clients to start sending automated reminders</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                whitelist.map((item, index) => (
                                                    <motion.tr
                                                        key={item.id}
                                                        ref={index === whitelist.length - 1 ? lastWhitelistElementRef : null}
                                                        className="hover:bg-gray-50/50 transition-colors"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.03 }}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                                                    <FiUser className="w-4 h-4 text-indigo-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-800">{item.name}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="space-y-0.5">
                                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                                    <FiPhone className="w-3 h-3 text-gray-400" />
                                                                    {item.mobile}
                                                                </p>
                                                                <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                                                    {item.email}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${item.has_debit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                <FiDollarSign className="w-3 h-3 mr-1" />
                                                                ₹{formatCurrency(item.balance)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="space-y-1">
                                                                <p className="font-medium text-gray-800 text-sm">{item.schedule_name}</p>
                                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <FiClock className="w-3 h-3" />
                                                                    {item.schedule_display}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => processGroup(item.group_id, item.schedule_name)}
                                                                    disabled={processingGroup === item.group_id}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                    title="Send Now"
                                                                >
                                                                    {processingGroup === item.group_id ? (
                                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                                                    ) : (
                                                                        <FiSend className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteWhitelist(item)}
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                    title="Remove"
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
                                    <div className="px-6 py-4 text-center border-t border-gray-100">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="schedule"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {scheduleList.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FiCalendar className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-1">No schedules yet</h3>
                                        <p className="text-gray-500 text-sm mb-4">Create your first reminder schedule</p>
                                        <button
                                            onClick={() => setShowCreateScheduleModal(true)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                                        >
                                            Create Schedule
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {scheduleList.map((schedule, index) => (
                                            <motion.div
                                                key={schedule.schedule_id}
                                                initial={{ opacity: 0, scale: 0.97 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full ${
                                                    schedule.status === '1' 
                                                        ? 'border-l-4 border-l-indigo-500 border-gray-200' 
                                                        : 'border-l-4 border-l-gray-300 border-gray-200'
                                                }`}
                                            >
                                                <div className="p-5 flex-grow">
                                                    <div className="min-w-0 flex-1 mb-3">
                                                        <h3 className="font-semibold text-gray-800 text-base truncate" title={schedule.name}>
                                                            {schedule.name}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                                schedule.type === 'daily' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                                schedule.type === 'weekly' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                                'bg-green-50 text-green-700 border border-green-100'
                                                            }`}>
                                                                {schedule.type.toUpperCase()}
                                                            </span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                                schedule.status === '1' 
                                                                    ? 'bg-green-50 text-green-700 border border-green-100' 
                                                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                            }`}>
                                                                {schedule.status === '1' ? 'ACTIVE' : 'INACTIVE'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4">
                                                        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                                                            <FiClock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                            <span className="font-medium truncate" title={schedule.schedule_display}>
                                                                {schedule.schedule_display || 'Schedule not configured'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50/70 border-t border-gray-100 px-5 py-3 flex items-center justify-between mt-auto">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <FiUsers className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span>
                                                            <strong className="font-semibold text-gray-700">{schedule.count}</strong> client(s)
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <button
                                                            onClick={() => processGroup(schedule.schedule_id, schedule.name)}
                                                            disabled={processingGroup === schedule.schedule_id}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                                                            title="Run Now"
                                                        >
                                                            {processingGroup === schedule.schedule_id ? (
                                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent"></div>
                                                            ) : (
                                                                <FiSend className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewLogs(schedule.schedule_id, schedule.name)}
                                                            className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition"
                                                            title="View Logs"
                                                        >
                                                            <FiClock className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditScheduleClick(schedule)}
                                                            className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition"
                                                            title="Edit"
                                                        >
                                                            <FiEdit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSchedule(schedule.schedule_id, schedule.name)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Add Client Modal */}
            <AnimatePresence>
                {showCreateWhitelistModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateWhitelistModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">Add Clients to Schedule</h3>
                                    <button onClick={() => setShowCreateWhitelistModal(false)} className="text-white/80 hover:text-white transition">
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                <form onSubmit={handleWhitelistSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Schedule</label>
                                        <select
                                            value={whitelistForm.schedule_id}
                                            onChange={(e) => handleWhitelistChange('schedule_id', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        >
                                            <option value="">Choose a schedule...</option>
                                            {schedules.map(s => (
                                                <option key={s.schedule_id} value={s.schedule_id}>{s.name} ({s.type})</option>
                                            ))}
                                        </select>
                                        {whitelistForm.show_schedule && (
                                            <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                                                <FiClock className="w-3 h-3" />
                                                {whitelistForm.show_schedule}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Clients</label>
                                        <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                                            {allClients.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500">Loading clients...</div>
                                            ) : (
                                                allClients.map(client => (
                                                    <label key={client.username} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer transition">
                                                        <input
                                                            type="checkbox"
                                                            checked={whitelistForm.usernames.includes(client.username)}
                                                            onChange={() => {
                                                                const newUsernames = whitelistForm.usernames.includes(client.username)
                                                                    ? whitelistForm.usernames.filter(u => u !== client.username)
                                                                    : [...whitelistForm.usernames, client.username];
                                                                handleWhitelistChange('usernames', newUsernames);
                                                            }}
                                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                        />
                                                        <div className="ml-3 flex-1">
                                                            <p className="font-medium text-gray-800">{client.name}</p>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                                <span className="flex items-center gap-1"><FiPhone className="w-3 h-3" />{client.mobile}</span>
                                                                <span className="flex items-center gap-1"><FiMail className="w-3 h-3" />{client.email}</span>
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Selected: {whitelistForm.usernames.length} client(s)
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateWhitelistModal(false)}
                                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
                                        >
                                            Add to Schedule
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateScheduleModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">Create Schedule</h3>
                                    <button onClick={() => setShowCreateScheduleModal(false)} className="text-white/80 hover:text-white transition">
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <form onSubmit={handleScheduleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
                                        <input
                                            type="text"
                                            value={scheduleForm.name}
                                            onChange={(e) => handleScheduleChange('name', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., Monthly Payment Reminder"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                        <select
                                            value={scheduleForm.type}
                                            onChange={(e) => handleScheduleChange('type', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            <option value="">Select frequency</option>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>

                                    {scheduleForm.type === 'weekly' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                                            <select
                                                value={scheduleForm.day}
                                                onChange={(e) => handleScheduleChange('day', e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            >
                                                <option value="">Select day</option>
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
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                                            <select
                                                value={scheduleForm.date}
                                                onChange={(e) => handleScheduleChange('date', e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            >
                                                <option value="">Select date</option>
                                                {Array.from({ length: 31 }, (_, i) => (
                                                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                        {i + 1}{i + 1 === 1 ? 'st' : i + 1 === 2 ? 'nd' : i + 1 === 3 ? 'rd' : 'th'}
                                                    </option>
                                                ))}
                                                <option value="last day">Last day of month</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={scheduleForm.hour}
                                                onChange={(e) => handleScheduleChange('hour', e.target.value)}
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            >
                                                <option value="">Hour</option>
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={String(i).padStart(2, '0')}>
                                                        {i === 0 ? '12' : i > 12 ? i - 12 : i}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={scheduleForm.minute}
                                                onChange={(e) => handleScheduleChange('minute', e.target.value)}
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="00">00</option>
                                                <option value="15">15</option>
                                                <option value="30">30</option>
                                                <option value="45">45</option>
                                            </select>
                                            <select
                                                value={scheduleForm.hour >= 12 ? 'PM' : 'AM'}
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
                                                disabled
                                            >
                                                <option>{scheduleForm.hour >= 12 ? 'PM' : 'AM'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateScheduleModal(false)}
                                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowEditScheduleModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">Edit Schedule</h3>
                                    <button onClick={() => setShowEditScheduleModal(false)} className="text-white/80 hover:text-white transition">
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <form onSubmit={handleEditScheduleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
                                        <input
                                            type="text"
                                            value={editScheduleForm.name}
                                            onChange={(e) => handleEditScheduleChange('name', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                        <select
                                            value={editScheduleForm.type}
                                            onChange={(e) => handleEditScheduleChange('type', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>

                                    {editScheduleForm.type === 'weekly' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                                            <select
                                                value={editScheduleForm.day}
                                                onChange={(e) => handleEditScheduleChange('day', e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
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
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                                            <select
                                                value={editScheduleForm.date}
                                                onChange={(e) => handleEditScheduleChange('date', e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                {Array.from({ length: 31 }, (_, i) => (
                                                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                        {i + 1}{i + 1 === 1 ? 'st' : i + 1 === 2 ? 'nd' : i + 1 === 3 ? 'rd' : 'th'}
                                                    </option>
                                                ))}
                                                <option value="last day">Last day of month</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={editScheduleForm.hour}
                                                onChange={(e) => handleEditScheduleChange('hour', e.target.value)}
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <option key={i} value={String(i).padStart(2, '0')}>
                                                        {i === 0 ? '12' : i > 12 ? i - 12 : i}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={editScheduleForm.minute}
                                                onChange={(e) => handleEditScheduleChange('minute', e.target.value)}
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="00">00</option>
                                                <option value="15">15</option>
                                                <option value="30">30</option>
                                                <option value="45">45</option>
                                            </select>
                                            <select
                                                value={editScheduleForm.hour >= 12 ? 'PM' : 'AM'}
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
                                                disabled
                                            >
                                                <option>{editScheduleForm.hour >= 12 ? 'PM' : 'AM'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={editScheduleForm.status}
                                            onChange={(e) => handleEditScheduleChange('status', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowEditScheduleModal(false)}
                                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowLogsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">Execution Logs</h3>
                                    <button onClick={() => setShowLogsModal(false)} className="text-white/80 hover:text-white transition">
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                {logs.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FiAlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No logs found for this schedule</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {logs.map((log, idx) => (
                                            <div key={log.log_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                                                        log.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {log.status === 'completed' && <FiCheckCircle className="w-3 h-3" />}
                                                        {log.status === 'failed' && <FiAlertCircle className="w-3 h-3" />}
                                                        {log.status === 'skipped' && <FiClock className="w-3 h-3" />}
                                                        {log.status.toUpperCase()}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(log.run_date).toLocaleString()}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-3 mt-3">
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500">Sent</p>
                                                        <p className="text-lg font-bold text-green-600">{log.sent_count || 0}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500">Skipped</p>
                                                        <p className="text-lg font-bold text-yellow-600">{log.skipped_count || 0}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-gray-500">Failed</p>
                                                        <p className="text-lg font-bold text-red-600">{log.failed_count || 0}</p>
                                                    </div>
                                                </div>
                                                
                                                {log.message && (
                                                    <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">{log.message}</p>
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