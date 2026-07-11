import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiSettings, FiClock, FiUsers, FiCalendar, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiX, FiSend, FiLoader, FiUser, FiPhone, FiMail, FiDollarSign } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import toast from 'react-hot-toast';
import SearchableSelect from '../../components/SearchableSelect';
import TablePagination from '../../components/TablePagination';
import { DateRangePickerField } from '../../components/PortalDatePicker';

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

    // Whitelist states
    const [allFilteredWhitelist, setAllFilteredWhitelist] = useState([]);
    const [whitelistPage, setWhitelistPage] = useState(1);
    const [whitelistLimit, setWhitelistLimit] = useState(10);
    const [showCreateWhitelistModal, setShowCreateWhitelistModal] = useState(false);
    const [showMoreSchedules, setShowMoreSchedules] = useState(false);
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

    // Logs view states
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [selectedLogGroup, setSelectedLogGroup] = useState('');
    const [logDateRange, setLogDateRange] = useState({ start: '', end: '' });
    const [logsPage, setLogsPage] = useState(1);
    const [logsLimit, setLogsLimit] = useState(10);
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [expandedLogMembers, setExpandedLogMembers] = useState({});
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');

    // Group selection states in Add Client modal
    const [userGroups, setUserGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [selectedGroupForSelection, setSelectedGroupForSelection] = useState('');

    // Members list modal states
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [selectedScheduleForMembers, setSelectedScheduleForMembers] = useState(null);
    const [scheduleMembers, setScheduleMembers] = useState([]);
    const [loadingMembersModal, setLoadingMembersModal] = useState(false);

    const [modalMemberSearch, setModalMemberSearch] = useState('');

    // Form states
    const [whitelistForm, setWhitelistForm] = useState({
        usernames: [],
        schedule_id: '',
        show_schedule: ''
    });

    // Derived whitelist pagination states
    const totalWhitelistPages = Math.ceil(allFilteredWhitelist.length / whitelistLimit) || 1;
    const startIndex = (whitelistPage - 1) * whitelistLimit;
    const paginatedWhitelist = allFilteredWhitelist.slice(startIndex, startIndex + whitelistLimit);

    // Derived logs filtering & pagination states
    const filteredLogs = React.useMemo(() => {
        return logs.filter(log => {
            if (logDateRange.start && logDateRange.end) {
                const runDate = new Date(log.run_date);
                const startDate = new Date(logDateRange.start);
                const endDate = new Date(logDateRange.end);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                return runDate >= startDate && runDate <= endDate;
            }
            return true;
        });
    }, [logs, logDateRange]);

    const totalLogsPages = Math.ceil(filteredLogs.length / logsLimit) || 1;
    const startLogsIndex = (logsPage - 1) * logsLimit;
    const paginatedLogs = filteredLogs.slice(startLogsIndex, startLogsIndex + logsLimit);

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
                // Sort active schedules to top
                const sortedSchedules = [...scheduleData].sort((a, b) => {
                    if (a.status === '1' && b.status !== '1') return -1;
                    if (a.status !== '1' && b.status === '1') return 1;
                    return 0;
                });
                setSchedules(sortedSchedules);
                setScheduleList(sortedSchedules);
                return sortedSchedules;
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
    const fetchWhitelist = async (scheduleId = '', search = '') => {
        const headers = getHeaders();
        if (!headers) return;

        setLoading(true);

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
                        const uniqueMembersMap = new Map();
                        membersResult.data.forEach(member => {
                            if (member && member.username && !uniqueMembersMap.has(member.username)) {
                                uniqueMembersMap.set(member.username, member);
                            }
                        });

                        const membersWithSchedule = Array.from(uniqueMembersMap.values()).map(member => ({
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

                setAllFilteredWhitelist(allMembers);
                setWhitelistPage(1);
            }
        } catch (error) {
            console.error("Error fetching whitelist:", error);
            toast.error("Failed to fetch whitelist data");
        } finally {
            setLoading(false);
        }
    };

    // Fetch logs
    const fetchLogs = async (groupId = null, startDate = '', endDate = '') => {
        const headers = getHeaders();
        if (!headers) return;

        setLoadingLogs(true);
        try {
            let url = `${API_BASE_URL}/autopay/logs?limit=100`;
            if (groupId) {
                url += `&group_id=${groupId}`;
            }
            if (startDate) {
                url += `&start_date=${startDate}`;
            }
            if (endDate) {
                url += `&end_date=${endDate}`;
            }
            const response = await fetch(url, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                setLogs(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoadingLogs(false);
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

    const fetchUserGroups = async () => {
        const headers = getHeaders();
        if (!headers) return;

        setLoadingGroups(true);
        try {
            const response = await fetch(`${API_BASE_URL}/group/groups/all?limit=100`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                setUserGroups(result.data?.groups || []);
            }
        } catch (error) {
            console.error("Error fetching user groups:", error);
        } finally {
            setLoadingGroups(false);
        }
    };

    useEffect(() => {
        if (showCreateWhitelistModal && userGroups.length === 0) {
            fetchUserGroups();
        }
    }, [showCreateWhitelistModal]);

    const handleGroupSelection = async (groupId) => {
        if (!groupId) return;
        setSelectedGroupForSelection(groupId);
        const headers = getHeaders();
        if (!headers) return;

        const toastId = toast.loading("Fetching group members...");
        try {
            const response = await fetch(`${API_BASE_URL}/group/groups/all?group_id=${groupId}`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                const firms = result.data?.firms || [];
                const formattedClients = firms.map(f => f.client).filter(Boolean).map(client => ({
                    username: client.username || client.profile_id,
                    name: client.name || client.full_name || client.client_name || 'N/A',
                    mobile: client.mobile || client.phone || 'N/A',
                    email: client.email || 'N/A',
                    firm_name: client.firms?.[0]?.firm_name || 'Individual'
                }));

                // Merge into allClients so they render names correctly
                setAllClients(prev => {
                    const existingUsernames = new Set(prev.map(c => c.username));
                    const newClients = formattedClients.filter(c => !existingUsernames.has(c.username));
                    return [...prev, ...newClients];
                });

                const groupUsernames = formattedClients.map(c => c.username);
                if (groupUsernames.length === 0) {
                    toast.error("No clients found in this group", { id: toastId });
                    setSelectedGroupForSelection('');
                    return;
                }

                // Add to whitelistForm usernames
                setWhitelistForm(prev => {
                    const uniqueUsernames = [...new Set([...prev.usernames, ...groupUsernames])];
                    return { ...prev, usernames: uniqueUsernames };
                });

                // Also update selectedClientsForModal
                setSelectedClientsForModal(prev => [...new Set([...prev, ...groupUsernames])]);

                toast.success(`Added ${groupUsernames.length} clients from group to selection!`, { id: toastId });
            } else {
                toast.error(result.message || "Failed to fetch group details", { id: toastId });
            }
        } catch (error) {
            console.error("Error fetching group details:", error);
            toast.error("Failed to fetch group details", { id: toastId });
        } finally {
            setSelectedGroupForSelection('');
        }
    };

    const handleViewScheduleMembers = async (schedule) => {
        setSelectedScheduleForMembers(schedule);
        setShowMembersModal(true);
        setLoadingMembersModal(true);
        setModalMemberSearch('');

        const headers = getHeaders();
        if (!headers) {
            setLoadingMembersModal(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/members/${schedule.schedule_id}?limit=100`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success && result.data) {
                const uniqueMembersMap = new Map();
                result.data.forEach(member => {
                    if (member && member.username && !uniqueMembersMap.has(member.username)) {
                        uniqueMembersMap.set(member.username, member);
                    }
                });
                setScheduleMembers(Array.from(uniqueMembersMap.values()));
            } else {
                setScheduleMembers([]);
            }
        } catch (error) {
            console.error("Error fetching group members for modal:", error);
            toast.error("Failed to load schedule members");
        } finally {
            setLoadingMembersModal(false);
        }
    };

    const refreshScheduleMembers = async (scheduleId) => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/autopay/group/members/${scheduleId}?limit=100`, {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success && result.data) {
                const uniqueMembersMap = new Map();
                result.data.forEach(member => {
                    if (member && member.username && !uniqueMembersMap.has(member.username)) {
                        uniqueMembersMap.set(member.username, member);
                    }
                });
                setScheduleMembers(Array.from(uniqueMembersMap.values()));
            } else {
                setScheduleMembers([]);
            }
        } catch (error) {
            console.error("Error refreshing group members:", error);
        }
    };

    const handleRemoveMemberFromModal = async (username, clientName) => {
        if (!selectedScheduleForMembers) return;
        const groupId = selectedScheduleForMembers.schedule_id;

        const success = await removeMember(groupId, username, clientName);
        if (success) {
            await refreshScheduleMembers(groupId);
            await fetchSchedules();
            await fetchWhitelist(true);
        }
    };

    const handleOpenAddClientForSchedule = () => {
        if (!selectedScheduleForMembers) return;
        setWhitelistForm({
            usernames: [],
            schedule_id: selectedScheduleForMembers.schedule_id,
            show_schedule: selectedScheduleForMembers.name
        });
        setSelectedClientsForModal([]);
        setShowCreateWhitelistModal(true);
        setShowMembersModal(false);
    };

    const handleCancelWhitelist = () => {
        setShowCreateWhitelistModal(false);
        setShowMoreSchedules(false);
        resetWhitelistForm();
        if (selectedScheduleForMembers) {
            setShowMembersModal(true);
        }
    };

    const handleCloseMembersModal = () => {
        setShowMembersModal(false);
        setSelectedScheduleForMembers(null);
    };

    // Initial data load
    useEffect(() => {
        const loadInitialData = async () => {
            setInitialLoading(true);
            await fetchSchedules();
            await fetchWhitelist();
            await fetchStats();
            await fetchAllClients();
            setInitialLoading(false);
        };
        loadInitialData();
    }, []);

    // Reactive log fetching when logs tab is active or logs filters change
    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs(selectedLogGroup, logDateRange.start, logDateRange.end);
            setLogsPage(1); // Reset page on filter change
        }
    }, [activeTab, selectedLogGroup, logDateRange]);

    const handleToggleLogDetails = async (logId, groupId) => {
        if (expandedLogId === logId) {
            setExpandedLogId(null);
            setMemberSearchQuery('');
            return;
        }

        setExpandedLogId(logId);
        setMemberSearchQuery('');

        if (groupId && !expandedLogMembers[groupId]) {
            setLoadingMembers(true);
            const headers = getHeaders();
            if (!headers) {
                setLoadingMembers(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/autopay/group/members/${groupId}?limit=100`, {
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.success && result.data) {
                    const uniqueMembersMap = new Map();
                    result.data.forEach(member => {
                        if (member && member.username && !uniqueMembersMap.has(member.username)) {
                            uniqueMembersMap.set(member.username, member);
                        }
                    });

                    setExpandedLogMembers(prev => ({
                        ...prev,
                        [groupId]: Array.from(uniqueMembersMap.values())
                    }));
                }
            } catch (error) {
                console.error("Error fetching group members for log:", error);
                toast.error("Failed to fetch group members list");
            } finally {
                setLoadingMembers(false);
            }
        }
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

    // Whitelist functions
    const handleWhitelistSearch = (e) => {
        e.preventDefault();
        fetchWhitelist();
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
            fetchWhitelist();
            fetchSchedules();
            if (selectedScheduleForMembers && selectedScheduleForMembers.schedule_id === whitelistForm.schedule_id) {
                handleViewScheduleMembers(selectedScheduleForMembers);
            } else {
                setSelectedScheduleForMembers(null);
            }
        }
    };

    const handleDeleteWhitelist = async (item) => {
        const success = await removeMember(item.group_id, item.username, item.name);
        if (success) {
            fetchWhitelist();
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
        setShowMoreSchedules(false);
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
                            {[1, 2, 3].map(i => <div key={i} className="h-[88px] bg-gray-200 rounded-xl"></div>)}
                        </div>
                        <div className="h-12 bg-gray-200 rounded-lg mb-6 w-48"></div>
                        <div className="h-96 bg-gray-200 rounded-xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );

    const activeSchedulesForSelection = schedules.filter(s => s.status === '1');

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
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'whitelist'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <FiUsers className="w-3.5 h-3.5" />
                                Enrolled Clients
                                {allFilteredWhitelist.length > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${activeTab === 'whitelist'
                                            ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-100'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {allFilteredWhitelist.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'schedule'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <FiCalendar className="w-3.5 h-3.5" />
                                Schedules
                                {scheduleList.length > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${activeTab === 'schedule'
                                            ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-100'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {scheduleList.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'logs'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <FiClock className="w-3.5 h-3.5" />
                                Logs
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
                                                onClick={() => {
                                                    setSelectedScheduleForMembers(null);
                                                    setShowCreateWhitelistModal(true);
                                                }}
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
                                            {loading && allFilteredWhitelist.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : allFilteredWhitelist.length === 0 ? (
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
                                                paginatedWhitelist.map((item, index) => (
                                                    <motion.tr
                                                        key={item.id}
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

                                {allFilteredWhitelist.length > 0 && (
                                    <TablePagination
                                        page={whitelistPage}
                                        limit={whitelistLimit}
                                        total={allFilteredWhitelist.length}
                                        totalPages={totalWhitelistPages}
                                        onPageChange={(p) => setWhitelistPage(p)}
                                        onLimitChange={(l) => {
                                            setWhitelistLimit(l);
                                            setWhitelistPage(1);
                                        }}
                                        showRows={true}
                                        showJump={true}
                                    />
                                )}
                            </motion.div>
                        ) : activeTab === 'schedule' ? (
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
                                                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full ${schedule.status === '1'
                                                        ? 'border-l-4 border-l-emerald-500 border-gray-200'
                                                        : 'border-l-4 border-l-gray-300 border-gray-200'
                                                    }`}
                                            >
                                                <div className="p-5 flex-grow">
                                                    <div className="min-w-0 flex-1 mb-3">
                                                        <div className="flex justify-between items-start gap-4 mb-2">
                                                            <h3 className="font-bold text-gray-800 text-base leading-tight truncate" title={schedule.name}>
                                                                {schedule.name}
                                                            </h3>
                                                            <div className="flex items-center shrink-0">
                                                                {schedule.status === '1' ? (
                                                                    <span className="relative flex h-2 w-2 mr-1.5">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="relative flex h-2 w-2 mr-1.5">
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-300"></span>
                                                                    </span>
                                                                )}
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${schedule.status === '1'
                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                                        : 'bg-gray-50 text-gray-500 border border-gray-100'
                                                                    }`}>
                                                                    {schedule.status === '1' ? 'ACTIVE' : 'INACTIVE'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider ${schedule.type === 'daily' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                                                                    schedule.type === 'weekly' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                                        'bg-amber-50 text-amber-700 border border-amber-100'
                                                                }`}>
                                                                {schedule.type.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4">
                                                        <div className="flex items-center gap-2 text-xs text-gray-700 bg-indigo-50/20 px-3 py-2.5 rounded-xl border border-indigo-50/50">
                                                            <FiClock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                            <span className="font-semibold truncate" title={schedule.schedule_display}>
                                                                {schedule.schedule_display || 'Schedule not configured'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50/50 border-t border-gray-100 px-5 py-3 flex items-center justify-between mt-auto">
                                                    <button
                                                        onClick={() => handleViewScheduleMembers(schedule)}
                                                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-100/50 px-2 py-1 rounded-lg transition border border-indigo-100/40 cursor-pointer font-medium"
                                                        title="View Enrolled Clients"
                                                    >
                                                        <FiUsers className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                        <span>
                                                            <strong className="font-bold">{schedule.count}</strong> client(s)
                                                        </span>
                                                    </button>
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
                        ) : (
                            <motion.div
                                key="logs"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                            >
                                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="text-left">
                                            <h3 className="font-semibold text-gray-800 text-lg">Execution Logs</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">Track automated email reminders sent to clients</p>
                                        </div>

                                        {/* Filters Bar */}
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                                                {/* Group Dropdown */}
                                                <select
                                                    value={selectedLogGroup}
                                                    onChange={(e) => setSelectedLogGroup(e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 min-w-[180px]"
                                                >
                                                    <option value="">All Schedules</option>
                                                    {schedules.map(s => (
                                                        <option key={s.schedule_id} value={s.schedule_id}>
                                                            {s.name} ({s.status === '1' ? 'Active' : 'Inactive'})
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* DateRangePickerField */}
                                                <DateRangePickerField
                                                    value={logDateRange}
                                                    onChange={(val) => setLogDateRange(val)}
                                                    placeholder="Filter by date range"
                                                    buttonClassName="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 flex items-center justify-between gap-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 min-w-[240px]"
                                                    defaultQuickKey="tw"
                                                    quickOptionKeys={['td', 'yd', 'tw', 'lw', 'tm', 'lm']}
                                                />

                                                {/* Reset Button */}
                                                {(selectedLogGroup || logDateRange.start || logDateRange.end) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLogGroup('');
                                                            setLogDateRange({ start: '', end: '' });
                                                        }}
                                                        className="px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Area */}
                                <div className="overflow-x-auto font-sans">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="w-10"></th> {/* Expand Column */}
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Run Date</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule Group</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent</th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skipped</th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Failed</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary Message</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loadingLogs && paginatedLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="px-6 py-12 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : paginatedLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                                <FiClock className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                            <p className="text-gray-500 font-medium">No logs found</p>
                                                            <p className="text-sm text-gray-400 mt-1">Try expanding the date range or selecting a different schedule</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedLogs.map((log, index) => {
                                                    const isExpanded = expandedLogId === log.log_id;
                                                    const gName = log.group_name || schedules.find(s => s.schedule_id === log.group_id)?.name || 'Reminder Group';
                                                    return (
                                                        <React.Fragment key={log.log_id}>
                                                            <tr className={`hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-indigo-50/10' : ''}`}>
                                                                <td className="pl-4 py-4 text-center">
                                                                    <button
                                                                        onClick={() => handleToggleLogDetails(log.log_id, log.group_id)}
                                                                        className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors focus:outline-none"
                                                                        title="View Recipients"
                                                                    >
                                                                        <span className="block transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                                            ▶
                                                                        </span>
                                                                    </button>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium text-left">
                                                                    {new Date(log.run_date).toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold text-left">
                                                                    {gName}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-left">
                                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${log.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                            log.status === 'failed' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                                                                'bg-amber-50 text-amber-700 border border-amber-100'
                                                                        }`}>
                                                                        {log.status === 'completed' && <FiCheckCircle className="w-3 h-3" />}
                                                                        {log.status === 'failed' && <FiAlertCircle className="w-3 h-3" />}
                                                                        {log.status === 'skipped' && <FiClock className="w-3 h-3" />}
                                                                        {log.status.toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-600">
                                                                    {log.sent_count || 0}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-amber-600">
                                                                    {log.skipped_count || 0}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-rose-600">
                                                                    {log.failed_count || 0}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate text-left" title={log.message}>
                                                                    {log.message || 'No summary message'}
                                                                </td>
                                                            </tr>

                                                            {/* Expanded Row for Recipients Table */}
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan="8" className="bg-gray-50/80 px-8 py-5 border-t border-b border-indigo-100/50">
                                                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4">
                                                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                                                                                <div className="text-left">
                                                                                    <h4 className="font-semibold text-gray-800 text-sm">Recipient Details for {gName}</h4>
                                                                                    <p className="text-xs text-gray-500 mt-0.5">Listing group members and their execution statuses</p>
                                                                                </div>
                                                                                <div className="relative shrink-0">
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Search recipients..."
                                                                                        value={memberSearchQuery}
                                                                                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                                                        className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs w-48 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                                                    />
                                                                                    <FiSearch className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                                                                                </div>
                                                                            </div>

                                                                            {loadingMembers ? (
                                                                                <div className="py-8 text-center">
                                                                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
                                                                                    <p className="text-xs text-gray-400 mt-2">Loading members...</p>
                                                                                </div>
                                                                            ) : (
                                                                                (() => {
                                                                                    const members = expandedLogMembers[log.group_id] || [];
                                                                                    const filteredMembers = members.filter(m =>
                                                                                        m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                                                                                        m.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                                                                                        m.mobile?.includes(memberSearchQuery) ||
                                                                                        m.username?.toLowerCase().includes(memberSearchQuery.toLowerCase())
                                                                                    );

                                                                                    if (filteredMembers.length === 0) {
                                                                                        return (
                                                                                            <div className="text-center py-6 text-xs text-gray-500">
                                                                                                No matching recipients found in this schedule group
                                                                                            </div>
                                                                                        );
                                                                                    }

                                                                                    return (
                                                                                        <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                                                                            <table className="w-full text-xs text-sans">
                                                                                                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                                                                                    <tr>
                                                                                                        <th className="text-left px-4 py-2">Name</th>
                                                                                                        <th className="text-left px-4 py-2">Email</th>
                                                                                                        <th className="text-left px-4 py-2">Mobile</th>
                                                                                                        <th className="text-right px-4 py-2">Balance</th>
                                                                                                        <th className="text-center px-4 py-2">Status</th>
                                                                                                        <th className="text-left px-4 py-2">Action / Info</th>
                                                                                                    </tr>
                                                                                                </thead>
                                                                                                <tbody className="divide-y divide-gray-100 font-sans">
                                                                                                    {filteredMembers.map(m => {
                                                                                                        const hasDebit = m.has_debit || m.balance > 0;
                                                                                                        const isSent = hasDebit && log.status === 'completed';
                                                                                                        const isSkipped = !hasDebit || log.status === 'skipped';
                                                                                                        const isFailed = log.status === 'failed';

                                                                                                        let badgeColor = 'bg-yellow-50 text-yellow-700 border-yellow-100';
                                                                                                        let statusLabel = 'SKIPPED';
                                                                                                        if (isSent) {
                                                                                                            badgeColor = 'bg-green-50 text-green-700 border-green-100';
                                                                                                            statusLabel = 'SENT';
                                                                                                        } else if (isFailed) {
                                                                                                            badgeColor = 'bg-red-50 text-red-700 border-red-100';
                                                                                                            statusLabel = 'FAILED';
                                                                                                        }

                                                                                                        return (
                                                                                                            <tr key={m.username} className="hover:bg-gray-50/50">
                                                                                                                <td className="px-4 py-2.5 font-medium text-gray-800 text-left">{m.name || m.username}</td>
                                                                                                                <td className="px-4 py-2.5 text-gray-600 text-left">{m.email || 'N/A'}</td>
                                                                                                                <td className="px-4 py-2.5 text-gray-600 text-left">{m.mobile || 'N/A'}</td>
                                                                                                                <td className="px-4 py-2.5 text-right font-semibold text-gray-700">₹{formatCurrency(m.balance)}</td>
                                                                                                                <td className="px-4 py-2.5 text-center">
                                                                                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeColor}`}>
                                                                                                                        {statusLabel}
                                                                                                                    </span>
                                                                                                                </td>
                                                                                                                <td className="px-4 py-2.5 text-gray-500 text-left">
                                                                                                                    {isSent ? 'Reminder email sent' : isSkipped ? 'No debit balance (Skipped)' : 'Run did not complete'}
                                                                                                                </td>
                                                                                                            </tr>
                                                                                                        );
                                                                                                    })}
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </div>
                                                                                    );
                                                                                })()
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination for Logs */}
                                {filteredLogs.length > 0 && (
                                    <TablePagination
                                        page={logsPage}
                                        limit={logsLimit}
                                        total={filteredLogs.length}
                                        totalPages={totalLogsPages}
                                        onPageChange={(p) => setLogsPage(p)}
                                        onLimitChange={(l) => {
                                            setLogsLimit(l);
                                            setLogsPage(1);
                                        }}
                                        showRows={true}
                                        showJump={true}
                                    />
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
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                            onClick={handleCancelWhitelist}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        >
                            <div className="px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 shrink-0 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-white">Add Clients to Schedule</h3>
                                <button onClick={handleCancelWhitelist} className="text-white/80 hover:text-white transition">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleWhitelistSubmit} className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                <div
                                    className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Schedule</label>

                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                {activeSchedulesForSelection.slice(0, 3).map(s => {
                                                    const isSelected = whitelistForm.schedule_id === s.schedule_id;
                                                    return (
                                                        <button
                                                            key={s.schedule_id}
                                                            type="button"
                                                            onClick={() => handleWhitelistChange('schedule_id', s.schedule_id)}
                                                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${isSelected
                                                                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                                                                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <span className="font-semibold text-gray-800 text-xs block truncate w-full" title={s.name}>{s.name}</span>
                                                            <span className="text-[9px] text-indigo-600 font-medium capitalize mt-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100/50 inline-block">{s.type}</span>
                                                            <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                                <FiClock className="w-3 h-3 flex-shrink-0" />
                                                                <span className="line-clamp-2 leading-tight">{s.schedule_display || 'Not configured'}</span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}

                                                {/* More / Dropdown option */}
                                                {activeSchedulesForSelection.length > 3 && (
                                                    <div className="relative">
                                                        {(() => {
                                                            const isSelectedOther = whitelistForm.schedule_id && !activeSchedulesForSelection.slice(0, 3).some(s => s.schedule_id === whitelistForm.schedule_id);
                                                            const selectedOtherSchedule = activeSchedulesForSelection.slice(3).find(s => s.schedule_id === whitelistForm.schedule_id);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowMoreSchedules(!showMoreSchedules)}
                                                                    className={`w-full flex flex-col items-start p-3 rounded-xl border text-left transition-all h-full min-h-[92px] ${isSelectedOther
                                                                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                                                                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                                                        }`}
                                                                >
                                                                    {isSelectedOther && selectedOtherSchedule ? (
                                                                        <div className="w-full">
                                                                            <span className="font-semibold text-gray-800 text-xs block truncate w-full" title={selectedOtherSchedule.name}>{selectedOtherSchedule.name}</span>
                                                                            <span className="text-[9px] text-indigo-600 font-medium capitalize mt-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100/50 inline-block">{selectedOtherSchedule.type}</span>
                                                                            <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                                                <FiClock className="w-3 h-3 flex-shrink-0" />
                                                                                <span className="line-clamp-2 leading-tight">{selectedOtherSchedule.schedule_display || 'Not configured'}</span>
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center w-full h-full min-h-[64px] text-center">
                                                                            <span className="font-semibold text-gray-700 text-xs">+{activeSchedulesForSelection.length - 3} More</span>
                                                                            <span className="text-[10px] text-gray-400 mt-1">Select other...</span>
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expandable More Schedules Drawer */}
                                            {showMoreSchedules && activeSchedulesForSelection.length > 3 && (
                                                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Other Schedules</span>
                                                        <button type="button" onClick={() => setShowMoreSchedules(false)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                                                            Close
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                                                        {activeSchedulesForSelection.slice(3).map(s => {
                                                            const isSelected = whitelistForm.schedule_id === s.schedule_id;
                                                            return (
                                                                <button
                                                                    key={s.schedule_id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleWhitelistChange('schedule_id', s.schedule_id);
                                                                        setShowMoreSchedules(false);
                                                                    }}
                                                                    className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${isSelected
                                                                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                                                                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                                                        }`}
                                                                >
                                                                    <span className="font-semibold text-gray-800 text-xs block truncate w-full" title={s.name}>{s.name}</span>
                                                                    <span className="text-[9px] text-indigo-600 font-medium capitalize mt-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100/50 inline-block">{s.type}</span>
                                                                    <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                                        <FiClock className="w-3 h-3 flex-shrink-0" />
                                                                        <span className="truncate leading-none">{s.schedule_display || 'Not configured'}</span>
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {whitelistForm.show_schedule && (
                                                <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                                                    <FiCheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                                                    <span>Active Configuration: <strong className="font-semibold text-gray-700">{whitelistForm.show_schedule}</strong></span>
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Clients</label>
                                            <div className="border border-gray-300 rounded-lg p-3 space-y-3 bg-white">
                                                <div className="flex flex-col sm:flex-row gap-3 items-end pb-3 border-b border-gray-100">
                                                    <div className="flex-1 min-w-0 w-full">
                                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Add by Client Group</label>
                                                        <select
                                                            value={selectedGroupForSelection}
                                                            onChange={(e) => handleGroupSelection(e.target.value)}
                                                            disabled={loadingGroups}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                                                        >
                                                            <option value="">-- Select Client Group --</option>
                                                            {userGroups.map(g => (
                                                                <option key={g.group_id} value={g.group_id}>
                                                                    {g.group_name} ({g.firm_count || g.count || 0} firms)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <SearchableSelect
                                                    endpoint="/client/list"
                                                    queryParams={{ page: 1, limit: 20 }}
                                                    searchParam="search"
                                                    valueKey="username"
                                                    labelMapping={{
                                                        primary: 'name',
                                                        secondary: (item) => `${item.user_type || ''} • ${item.mobile || ''} • ${item.email || ''}`
                                                    }}
                                                    onSelect={(item, value) => {
                                                        if (value && !whitelistForm.usernames.includes(value)) {
                                                            const newUsernames = [...whitelistForm.usernames, value];
                                                            handleWhitelistChange('usernames', newUsernames);
                                                            if (item) {
                                                                const formattedItem = {
                                                                    username: item.username || item.profile_id || value,
                                                                    name: item.name || item.full_name || item.client_name || 'N/A',
                                                                    mobile: item.mobile || item.phone || 'N/A',
                                                                    email: item.email || 'N/A',
                                                                    firm_name: item.firms?.[0]?.firm_name || 'Individual'
                                                                };
                                                                setAllClients(prev => {
                                                                    if (prev.some(c => c.username === value)) return prev;
                                                                    return [...prev, formattedItem];
                                                                });
                                                            }
                                                            setSelectedClientsForModal(prev => {
                                                                if (prev.includes(value)) return prev;
                                                                return [...prev, value];
                                                            });
                                                        }
                                                    }}
                                                    placeholder="Search client by name or mobile..."
                                                    dataExtractor={(response) => {
                                                        return response?.data || [];
                                                    }}
                                                />

                                                <div className="mt-2">
                                                    {whitelistForm.usernames.length > 0 ? (
                                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                                                                Selected Clients ({whitelistForm.usernames.length})
                                                            </span>
                                                            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                                                {whitelistForm.usernames.map(username => {
                                                                    const client = allClients.find(c => c.username === username) || {
                                                                        name: username,
                                                                        mobile: 'N/A'
                                                                    };
                                                                    return (
                                                                        <div
                                                                            key={username}
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-100 rounded-full shadow-sm text-xs text-gray-800"
                                                                        >
                                                                            <FiUser className="w-3 h-3 text-indigo-500" />
                                                                            <span className="font-medium text-[11px]">{client.name}</span>
                                                                            {client.mobile && client.mobile !== 'N/A' && (
                                                                                <>
                                                                                    <span className="text-gray-300">|</span>
                                                                                    <span className="text-gray-500 text-[10px]">{client.mobile}</span>
                                                                                </>
                                                                            )}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newUsernames = whitelistForm.usernames.filter(u => u !== username);
                                                                                    handleWhitelistChange('usernames', newUsernames);
                                                                                }}
                                                                                className="ml-1 p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                                                            >
                                                                                <FiX className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-xs">
                                                            <FiUsers className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                                                            Search and select clients from the search bar above.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 shrink-0 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCancelWhitelist}
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
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                            onClick={() => setShowCreateScheduleModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        >
                            <div className="px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600 shrink-0 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-white">Create Schedule</h3>
                                <button onClick={() => setShowCreateScheduleModal(false)} className="text-white/80 hover:text-white transition">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleScheduleSubmit} className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                <div
                                    className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <div className="space-y-5">
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
                                    </div>
                                </div>

                                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 shrink-0 flex justify-end gap-3">
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
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                            onClick={() => setShowEditScheduleModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        >
                            <div className="px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 shrink-0 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-white">Edit Schedule</h3>
                                <button onClick={() => setShowEditScheduleModal(false)} className="text-white/80 hover:text-white transition">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleEditScheduleSubmit} className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                <div
                                    className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <div className="space-y-5">
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
                                    </div>
                                </div>

                                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 shrink-0 flex justify-end gap-3">
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
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                            onClick={() => setShowLogsModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        >
                            <div className="px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600 shrink-0 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-white">Execution Logs</h3>
                                <button onClick={() => setShowLogsModal(false)} className="text-white/80 hover:text-white transition">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <div
                                className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
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
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${log.status === 'completed' ? 'bg-green-100 text-green-700' :
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

                            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 shrink-0 flex justify-end">
                                <button
                                    onClick={() => setShowLogsModal(false)}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Schedule Members Modal */}
            <AnimatePresence>
                    {showMembersModal && selectedScheduleForMembers && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
                        >
                            <div
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                                onClick={handleCloseMembersModal}
                            />
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            >
                                <div className="px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 shrink-0 flex justify-between items-center">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-semibold text-white truncate">
                                            Clients in {selectedScheduleForMembers.name}
                                        </h3>
                                        <p className="text-white/80 text-[11px] truncate">
                                            {selectedScheduleForMembers.schedule_display || 'Reminder schedule configuration'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleOpenAddClientForSchedule}
                                            className="p-1.5 rounded-lg bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
                                            title="Add Client to this Schedule"
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            <span>Add Client</span>
                                        </button>
                                        <button type="button" onClick={handleCloseMembersModal} className="text-white/80 hover:text-white transition p-1">
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                                    {/* Search Bar for filtering list */}
                                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0 flex items-center">
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                value={modalMemberSearch}
                                                onChange={(e) => setModalMemberSearch(e.target.value)}
                                                placeholder="Filter clients inside this schedule..."
                                                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                            />
                                            <FiSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Members List Table */}
                                    <div
                                        className="flex-1 overflow-y-auto overscroll-y-contain"
                                        style={{ scrollbarWidth: 'thin' }}
                                    >
                                        {loadingMembersModal ? (
                                            <div className="flex justify-center items-center py-16">
                                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                                            </div>
                                        ) : (
                                            (() => {
                                                const filtered = scheduleMembers.filter(m => {
                                                    if (!modalMemberSearch) return true;
                                                    const searchLower = modalMemberSearch.toLowerCase();
                                                    return (
                                                        m.name?.toLowerCase().includes(searchLower) ||
                                                        m.username?.toLowerCase().includes(searchLower) ||
                                                        m.mobile?.includes(modalMemberSearch) ||
                                                        m.email?.toLowerCase().includes(searchLower)
                                                    );
                                                });

                                                if (filtered.length === 0) {
                                                    return (
                                                        <div className="text-center py-16 px-4">
                                                            <FiUsers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                                            <p className="text-gray-500 text-sm font-medium">No clients found</p>
                                                            <p className="text-gray-400 text-xs mt-0.5">
                                                                {modalMemberSearch ? 'No clients match your filter' : 'No clients are currently added to this schedule.'}
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-gray-50 border-b border-gray-150 sticky top-0 z-[2]">
                                                            <tr>
                                                                <th className="px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                                                                <th className="px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                                                <th className="px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Balance</th>
                                                                <th className="px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-20">Remove</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 bg-white">
                                                            {filtered.map(member => (
                                                                <tr key={member.member_id || member.username} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="px-5 py-3">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                                                                                <FiUser className="w-3.5 h-3.5 text-indigo-600" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="font-semibold text-gray-800 text-xs truncate">{member.name || member.username}</p>
                                                                                <p className="text-[10px] text-gray-400 truncate">{member.username}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3">
                                                                        <div className="text-[11px] space-y-0.5">
                                                                            <p className="text-gray-600 font-medium flex items-center gap-1">
                                                                                <FiPhone className="w-2.5 h-2.5 text-gray-400" />
                                                                                {member.mobile || 'N/A'}
                                                                            </p>
                                                                            <p className="text-gray-500 truncate max-w-[150px]">
                                                                                {member.email || 'N/A'}
                                                                            </p>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3 text-right">
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${member.has_debit ? 'bg-red-50 text-red-700 border border-red-100/55' : 'bg-green-50 text-green-700 border border-green-100/55'}`}>
                                                                            ₹{formatCurrency(member.balance || 0)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveMemberFromModal(member.username, member.name || member.username)}
                                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                            title="Remove client from schedule"
                                                                        >
                                                                            <FiTrash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                );
                                            })()
                                        )}
                                    </div>
                                </div>

                                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 shrink-0 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleCloseMembersModal}
                                        className="px-4 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-semibold"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
        </div>
    );
};

export default AutoReminder;