import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit, FiX, FiCheck, FiClipboard, FiLoader, FiUser, FiUsers, FiBriefcase, FiUserCheck, FiUserPlus, FiSearch, FiArrowRight, FiArrowLeft, FiCalendar, FiSave, FiRefreshCw } from 'react-icons/fi';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import axios from 'axios';
import 'rsuite/dist/rsuite.min.css';
import { toast } from 'react-hot-toast';

// Add custom styles for DatePicker
const datePickerStyles = `
  .rs-picker-popup {
    z-index: 9999 !important;
  }
  .rs-picker-toolbar {
    z-index: 9999 !important;
  }
  .rs-picker-date-menu {
    z-index: 9999 !important;
  }
`;

// Format date helper
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// Format date for API (YYYY-MM-DD)
const formatDateForAPI = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

const DetailsTab = ({ taskData: initialData, task_id, onTaskUpdated }) => {
    const [taskData, setTaskData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(null);
    
    // Status change state
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');

    // New state for complex fields
    const [selectedFirmOptions, setSelectedFirmOptions] = useState([]);
    const [selectedGroupOptions, setSelectedGroupOptions] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
    
    // Search states
    const [firmSearchQuery, setFirmSearchQuery] = useState('');
    const [firmSearchResults, setFirmSearchResults] = useState([]);
    const [firmSearchLoading, setFirmSearchLoading] = useState(false);
    const [caSearchQuery, setCaSearchQuery] = useState('');
    const [caSearchResults, setCaSearchResults] = useState([]);
    const [caSearchLoading, setCaSearchLoading] = useState(false);
    const [agentSearchQuery, setAgentSearchQuery] = useState('');
    const [agentSearchResults, setAgentSearchResults] = useState([]);
    const [agentSearchLoading, setAgentSearchLoading] = useState(false);
    
    // Group search
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const [groupSearchResults, setGroupSearchResults] = useState([]);
    const [groupSearchLoading, setGroupSearchLoading] = useState(false);
    
    // Abort controllers
    const firmSearchAbortRef = useRef(null);
    const caSearchAbortRef = useRef(null);
    const agentSearchAbortRef = useRef(null);
    const groupSearchAbortRef = useRef(null);

    // Data lists
    const [serviceCategories, setServiceCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [filteredServices, setFilteredServices] = useState([]);
    const [groups, setGroups] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [fullStaffList, setFullStaffList] = useState([]);

    // Display states
    const [selectedCaDisplay, setSelectedCaDisplay] = useState(null);
    const [selectedAgentDisplay, setSelectedAgentDisplay] = useState(null);
    const [firmOwnerDisplay, setFirmOwnerDisplay] = useState(null);

    // Status options
    const statusOptions = [
        { value: 'unassign', name: 'Unassign', color: 'blue' },
        { value: 'in process', name: 'In Process', color: 'orange' },
        { value: 'pending from client', name: 'Pending from Client', color: 'purple' },
        { value: 'pending from department', name: 'Pending from Department', color: 'yellow' },
        { value: 'complete', name: 'Complete', color: 'green' },
        { value: 'cancel', name: 'Cancel', color: 'red' }
    ];

    // Initialize data when component mounts
    useEffect(() => {
        if (taskData) {
            initializeComplexFields();
            fetchSupportingData();
            setSelectedStatus(taskData.status || '');
        }
    }, [taskData]);

    // Filter services when category changes
    useEffect(() => {
        if (taskData.service?.category_id) {
            const filtered = services.filter(service => 
                service.category_id === taskData.service.category_id
            );
            setFilteredServices(filtered);
        } else {
            setFilteredServices(services);
        }
    }, [taskData.service?.category_id, services]);

    // Filter available employees based on search
    const filteredAvailableEmployees = React.useMemo(() => {
        const q = (employeeSearchQuery || '').trim().toLowerCase();
        if (!q) return allEmployees;
        return allEmployees.filter((emp) => {
            const name = (emp.name || '').toLowerCase();
            const mobile = (emp.mobile || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const dept = (emp.department || '').toLowerCase();
            return name.includes(q) || mobile.includes(q) || email.includes(q) || dept.includes(q);
        });
    }, [allEmployees, employeeSearchQuery]);

    // Initialize complex fields from taskData
    const initializeComplexFields = () => {
        setEditedData({ ...taskData });
        
        // Initialize firms
        if (taskData.firms && Array.isArray(taskData.firms)) {
            const firmOptions = taskData.firms.map(firm => ({
                value: firm.firm_id || firm.id,
                label: firm.firm_name || firm.name || 'Unknown Firm',
                owner_name: firm.owner_name || firm.owner?.name || 'N/A',
                owner_username: firm.owner_username || firm.owner?.username,
                __firm: firm
            }));
            setSelectedFirmOptions(firmOptions);
            
            if (firmOptions.length > 0) {
                setFirmOwnerDisplay({
                    name: firmOptions[0].owner_name,
                    username: firmOptions[0].owner_username
                });
            }
        }

        // Initialize groups (view only - not editable)
        if (taskData.groups && Array.isArray(taskData.groups)) {
            const groupOptions = taskData.groups.map(group => ({
                value: group.group_id || group.id,
                label: group.name || group.group_name || 'Unknown Group',
                firm_count: group.firm_count || 0,
                __group: group
            }));
            setSelectedGroupOptions(groupOptions);
        }

        // Initialize staff (view only - not editable)
        if (taskData.staffs && Array.isArray(taskData.staffs)) {
            const staffList = taskData.staffs.map(staff => ({
                username: staff.username,
                name: staff.name || staff.username,
                mobile: staff.mobile || '',
                email: staff.email || '',
                department: staff.designation || ''
            }));
            setSelectedEmployees(staffList);
        }

        // Initialize CA
        if (taskData.has_ca && taskData.ca) {
            setSelectedCaDisplay({ 
                username: taskData.ca.username, 
                name: taskData.ca.name,
                email: taskData.ca.email,
                mobile: taskData.ca.mobile,
                country_code: taskData.ca.country_code
            });
        }

        // Initialize Agent
        if (taskData.has_agent && taskData.agent) {
            setSelectedAgentDisplay({ 
                username: taskData.agent.username, 
                name: taskData.agent.name 
            });
        }
    };

    // Fetch supporting data
    const fetchSupportingData = async () => {
        const headers = await getHeaders();
        if (!headers) return;

        try {
            // Fetch service categories
            const catRes = await axios.get(`${API_BASE_URL}/service/category/list`, { headers });
            if (catRes.data?.success) {
                setServiceCategories(catRes.data.data || []);
            }

            // Fetch services
            const servicesRes = await axios.get(`${API_BASE_URL}/service/list`, { headers });
            if (servicesRes.data?.success) {
                setServices(servicesRes.data.data || []);
            }

            // Fetch groups (view only)
            fetchAllGroups();
            
            // Fetch staff (view only)
            fetchAllStaff();
        } catch (err) {
            console.error('Error fetching supporting data:', err);
        }
    };

    // Fetch all groups
    const fetchAllGroups = async () => {
        setGroupsLoading(true);
        const all = [];
        let page = 1;
        const limit = 100;
        const base = API_BASE_URL.replace(/\/$/, '');
        try {
            for (; ;) {
                const url = `${base}/group/list?search=&page=${page}&limit=${limit}`;
                const res = await fetch(url, { headers: await getHeaders() });
                const data = await res.json();
                const list = data?.data && Array.isArray(data.data) ? data.data : [];
                all.push(...list);
                const pagination = data?.pagination;
                if (pagination?.is_last_page) break;
                page += 1;
            }
            setGroups(all);
        } catch (err) {
            console.error('Failed to fetch groups:', err);
        } finally {
            setGroupsLoading(false);
        }
    };

    // Group search (view only - not adding)
    useEffect(() => {
        const term = (groupSearchQuery || '').trim();
        if (term.length < 3) {
            setGroupSearchResults([]);
            setGroupSearchLoading(false);
            return;
        }
        const t = setTimeout(async () => {
            setGroupSearchLoading(true);
            groupSearchAbortRef.current?.abort();
            const controller = new AbortController();
            groupSearchAbortRef.current = controller;
            try {
                const url = `${API_BASE_URL.replace(/\/$/, '')}/group/search?search=${encodeURIComponent(term)}`;
                const res = await fetch(url, { headers: await getHeaders(), signal: controller.signal });
                const data = await res.json();
                if (data.success) {
                    const list = Array.isArray(data?.data) ? data.data : [];
                    const options = list.map(g => ({
                        value: g.group_id,
                        label: g.name || 'Unknown Group',
                        firm_count: g.firm_count || 0,
                        __group: g
                    }));
                    setGroupSearchResults(options);
                } else {
                    setGroupSearchResults([]);
                }
            } catch (err) {
                if (err?.name !== 'AbortError') setGroupSearchResults([]);
            } finally {
                setGroupSearchLoading(false);
            }
        }, 400);
        return () => {
            clearTimeout(t);
            groupSearchAbortRef.current?.abort();
        };
    }, [groupSearchQuery]);

    // Fetch all staff (view only)
    const fetchAllStaff = async () => {
        setStaffLoading(true);
        const all = [];
        let page = 1;
        const limit = 100;
        const base = API_BASE_URL.replace(/\/$/, '');
        const headers = await getHeaders();
        if (!headers) {
            setStaffLoading(false);
            return;
        }
        try {
            for (; ;) {
                const url = `${base}/settings/staff/list?search=&page=${page}&limit=${limit}`;
                const res = await fetch(url, { headers });
                const json = await res.json();
                const list = json?.data && Array.isArray(json.data) ? json.data : [];
                all.push(...list);
                const meta = json?.meta;
                if (meta?.is_last_page) break;
                page += 1;
            }
            const mapped = all.map((item) => ({
                username: item.username,
                name: item.profile?.name ?? item.username,
                mobile: item.profile?.mobile ?? '',
                email: item.profile?.email ?? '',
                department: item.designation ?? ''
            }));
            setFullStaffList(mapped);
            
            // Update all employees list excluding selected ones
            const selectedUsernames = new Set(selectedEmployees.map(emp => emp.username));
            setAllEmployees(mapped.filter(emp => !selectedUsernames.has(emp.username)));
        } catch (err) {
            console.error('Failed to fetch staff list:', err);
        } finally {
            setStaffLoading(false);
        }
    };

    // Firm search
    useEffect(() => {
        const term = (firmSearchQuery || '').trim();
        if (term.length < 3) {
            setFirmSearchResults([]);
            setFirmSearchLoading(false);
            return;
        }
        const t = setTimeout(async () => {
            setFirmSearchLoading(true);
            firmSearchAbortRef.current?.abort();
            const controller = new AbortController();
            firmSearchAbortRef.current = controller;
            try {
                const url = `${API_BASE_URL.replace(/\/$/, '')}/firm/search?search=${encodeURIComponent(term)}`;
                const res = await fetch(url, { headers: await getHeaders(), signal: controller.signal });
                const data = await res.json();
                if (data.success) {
                    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                    const options = list.map(f => ({
                        value: f.firm_id,
                        label: f.client ? `${f.firm_name} – ${f.client.name}` : (f.firm_name || ''),
                        owner_name: f.owner_name || f.owner?.name || 'N/A',
                        owner_username: f.owner_username || f.owner?.username,
                        firm_name: f.firm_name,
                        client_name: f.client?.name,
                        __firm: f
                    }));
                    setFirmSearchResults(options);
                } else {
                    setFirmSearchResults([]);
                }
            } catch (err) {
                if (err?.name !== 'AbortError') setFirmSearchResults([]);
            } finally {
                setFirmSearchLoading(false);
            }
        }, 400);
        return () => {
            clearTimeout(t);
            firmSearchAbortRef.current?.abort();
        };
    }, [firmSearchQuery]);

    // CA search
    useEffect(() => {
        const term = (caSearchQuery || '').trim();
        if (term.length < 3) {
            setCaSearchResults([]);
            setCaSearchLoading(false);
            return;
        }
        const t = setTimeout(async () => {
            setCaSearchLoading(true);
            caSearchAbortRef.current?.abort();
            const controller = new AbortController();
            caSearchAbortRef.current = controller;
            try {
                const url = `${API_BASE_URL.replace(/\/$/, '')}/ca/search?search=${encodeURIComponent(term)}`;
                const res = await fetch(url, { headers: await getHeaders(), signal: controller.signal });
                const data = await res.json();
                if (data.success) {
                    const list = Array.isArray(data?.data) ? data.data : [];
                    setCaSearchResults(list);
                } else {
                    setCaSearchResults([]);
                }
            } catch (err) {
                if (err?.name !== 'AbortError') setCaSearchResults([]);
            } finally {
                setCaSearchLoading(false);
            }
        }, 400);
        return () => {
            clearTimeout(t);
            caSearchAbortRef.current?.abort();
        };
    }, [caSearchQuery]);

    // Agent search
    useEffect(() => {
        const term = (agentSearchQuery || '').trim();
        if (term.length < 3) {
            setAgentSearchResults([]);
            setAgentSearchLoading(false);
            return;
        }
        const t = setTimeout(async () => {
            setAgentSearchLoading(true);
            agentSearchAbortRef.current?.abort();
            const controller = new AbortController();
            agentSearchAbortRef.current = controller;
            try {
                const url = `${API_BASE_URL.replace(/\/$/, '')}/agent/search?search=${encodeURIComponent(term)}`;
                const res = await fetch(url, { headers: await getHeaders(), signal: controller.signal });
                const data = await res.json();
                if (data.success) {
                    const list = Array.isArray(data?.data) ? data.data : [];
                    setAgentSearchResults(list);
                } else {
                    setAgentSearchResults([]);
                }
            } catch (err) {
                if (err?.name !== 'AbortError') setAgentSearchResults([]);
            } finally {
                setAgentSearchLoading(false);
            }
        }, 400);
        return () => {
            clearTimeout(t);
            agentSearchAbortRef.current?.abort();
        };
    }, [agentSearchQuery]);

    // Handle edit button click
    const handleEditClick = () => {
        setEditedData({ ...taskData });
        setIsEditing(true);
        setSaveError(null);
        setSaveSuccess(null);
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedData(null);
        initializeComplexFields();
        setSaveError(null);
        setSaveSuccess(null);
    };

    // Handle status change using change-status API
    const handleStatusChange = async (newStatus) => {
        setIsChangingStatus(true);
        setSaveError(null);
        
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/task/change-status`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task_ids: [task_id],
                    status: newStatus
                })
            });
            
            const responseData = await response.json();
            
            if (responseData.success) {
                setSelectedStatus(newStatus);
                setTaskData(prev => ({ ...prev, status: newStatus }));
                toast.success(`Status updated to ${statusOptions.find(s => s.value === newStatus)?.name || newStatus}`);
                if (onTaskUpdated) onTaskUpdated();
            } else {
                throw new Error(responseData.message || 'Failed to update status');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            setSaveError(err.message || 'Failed to update status');
            toast.error(err.message || 'Failed to update status');
        } finally {
            setIsChangingStatus(false);
        }
    };

    // Handle save changes - using edit API
    const handleSaveChanges = async () => {
        const headers = await getHeaders();
        if (!headers) {
            setSaveError('Authentication failed. Please login again.');
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            // Prepare payload according to API spec: /task/edit/:task_id
            const payload = {
                firm_id: selectedFirmOptions.length > 0 ? selectedFirmOptions[0].value : (taskData.firm?.firm_id || ''),
                service_id: taskData.service?.service_id || '',
                fees: parseFloat(taskData.charges?.fees || taskData.fees || 0),
                tax_rate: parseFloat(taskData.charges?.tax_rate || taskData.tax_rate || 18),
                ca: {
                    has_ca: !!selectedCaDisplay
                },
                agent: {
                    has_agent: !!selectedAgentDisplay
                },
                due_date: taskData.dates?.due_date ? formatDateForAPI(taskData.dates.due_date) : '',
                target_date: taskData.dates?.target_date ? formatDateForAPI(taskData.dates.target_date) : ''
            };

            console.log('Submitting payload:', payload);

            const response = await fetch(`${API_BASE_URL}/task/edit/${task_id}`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            
            if (responseData.success) {
                setSaveSuccess('Task updated successfully!');
                
                // Update taskData with edited values
                setTaskData(prev => ({
                    ...prev,
                    firm: selectedFirmOptions[0]?.__firm || prev.firm,
                    firms: selectedFirmOptions.map(f => f.__firm),
                    service: {
                        ...prev.service,
                        service_id: payload.service_id
                    },
                    charges: {
                        ...prev.charges,
                        fees: payload.fees,
                        tax_rate: payload.tax_rate
                    },
                    dates: {
                        ...prev.dates,
                        due_date: payload.due_date,
                        target_date: payload.target_date
                    },
                    has_ca: !!selectedCaDisplay,
                    has_agent: !!selectedAgentDisplay,
                    ca: selectedCaDisplay,
                    agent: selectedAgentDisplay
                }));

                setIsEditing(false);
                
                if (onTaskUpdated) {
                    onTaskUpdated();
                }
                
                setTimeout(() => setSaveSuccess(null), 3000);
                toast.success('Task updated successfully');
            } else {
                setSaveError(responseData.message || 'Failed to update task');
                toast.error(responseData.message || 'Failed to update task');
            }
        } catch (err) {
            console.error('Error updating task:', err);
            if (err.response) {
                setSaveError(err.response.data?.message || `Error ${err.response.status}: Update failed`);
                toast.error(err.response.data?.message || `Error ${err.response.status}: Update failed`);
            } else if (err.request) {
                setSaveError('No response from server. Please check your connection.');
                toast.error('No response from server. Please check your connection.');
            } else {
                setSaveError(`Error: ${err.message}`);
                toast.error(`Error: ${err.message}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Complex field handlers
    const addFirm = async (option) => {
        if (selectedFirmOptions.some(o => o.value === option.value)) return;
        const next = [option]; // Only allow single firm selection
        setSelectedFirmOptions(next);
        
        if (next.length > 0) {
            setFirmOwnerDisplay({
                name: option.owner_name,
                username: option.owner_username
            });
        }
        setFirmSearchQuery('');
        setFirmSearchResults([]);
    };

    const removeFirm = async () => {
        setSelectedFirmOptions([]);
        setFirmOwnerDisplay(null);
    };

    const handleCaSelect = async (item) => {
        setSelectedCaDisplay({ 
            username: item.username, 
            name: item.name,
            email: item.email,
            mobile: item.mobile,
            country_code: item.country_code
        });
        setCaSearchQuery('');
        setCaSearchResults([]);
    };

    const handleCaClear = async () => {
        setSelectedCaDisplay(null);
    };

    const handleAgentSelect = async (item) => {
        setSelectedAgentDisplay({ username: item.username, name: item.name });
        setAgentSearchQuery('');
        setAgentSearchResults([]);
    };

    const handleAgentClear = async () => {
        setSelectedAgentDisplay(null);
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'unassign': return 'bg-blue-100 text-blue-700';
            case 'in process': return 'bg-orange-100 text-orange-700';
            case 'pending from client': return 'bg-purple-100 text-purple-700';
            case 'pending from department': return 'bg-yellow-100 text-yellow-700';
            case 'complete': return 'bg-green-100 text-green-700';
            case 'cancel': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'unassign': return 'Unassign';
            case 'in process': return 'In Process';
            case 'pending from client': return 'Pending from Client';
            case 'pending from department': return 'Pending from Department';
            case 'complete': return 'Complete';
            case 'cancel': return 'Cancel';
            default: return status || 'N/A';
        }
    };

    // Transform API data to display format
    const displayData = {
        service: taskData.service?.name || 'N/A',
        service_category: taskData.service?.category_name || 'N/A',
        client: taskData.client?.profile?.name || taskData.client?.name || 'N/A',
        firm: taskData.firm?.firm_name || (selectedFirmOptions[0]?.label) || 'N/A',
        firm_owner: firmOwnerDisplay?.name || taskData.firm?.owner_name || 'N/A',
        status: getStatusText(taskData.status),
        billing_status: taskData.billing_status ? taskData.billing_status.charAt(0).toUpperCase() + taskData.billing_status.slice(1) : 'N/A',
        fees: taskData.charges?.fees || 0,
        tax_rate: taskData.charges?.tax_rate || 0,
        due_date: formatDate(taskData.dates?.due_date),
        target_date: formatDate(taskData.dates?.target_date),
        create_date: taskData.dates?.create_date ? new Date(taskData.dates.create_date).toLocaleString() : 'N/A',
        created_by: taskData.create_by?.name || 'N/A',
        modified_by: taskData.modify_by?.name || 'N/A',
        is_recurring: taskData.is_recurring ? 'Yes' : 'No',
        has_ca: taskData.has_ca ? 'Yes' : 'No',
        has_agent: taskData.has_agent ? 'Yes' : 'No'
    };

    const DetailRow = ({ label, value, field, type = 'text', options = [] }) => (
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="font-medium text-gray-700 text-sm">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-gray-900 font-medium">{value}</span>
            </div>
        </div>
    );

    // Non-editable row (grayed out)
    const NonEditableRow = ({ label, value }) => (
        <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-gray-50 opacity-75">
            <span className="font-medium text-gray-500 text-sm">{label}</span>
            <span className="text-gray-400">{value}</span>
        </div>
    );

    return (
        <>
            <style>{datePickerStyles}</style>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FiClipboard className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Task Information</h3>
                    </div>
                    
                    {/* Edit/Save/Cancel Buttons */}
                    <div className="flex items-center gap-3">
                        {!isEditing ? (
                            <motion.button
                                onClick={handleEditClick}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FiEdit className="w-4 h-4" />
                                Edit Task
                            </motion.button>
                        ) : (
                            <>
                                <motion.button
                                    onClick={handleSaveChanges}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {isSaving ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSave className="w-4 h-4" />}
                                    Save Changes
                                </motion.button>
                                <motion.button
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiX className="w-4 h-4" />
                                    Cancel
                                </motion.button>
                            </>
                        )}
                    </div>

                    {/* Status Messages */}
                    <div className="flex items-center gap-3">
                        {saveSuccess && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-1"
                            >
                                <FiCheck className="w-4 h-4" />
                                {saveSuccess}
                            </motion.div>
                        )}
                        {saveError && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-1"
                            >
                                <FiX className="w-4 h-4" />
                                {saveError}
                            </motion.div>
                        )}
                    </div>
                </div>

                {!isEditing ? (
                    // View Mode
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Task Details */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-600 mb-4 pb-2 border-b">Task Details</h4>
                            <DetailRow label="CLIENT" value={displayData.client} />
                            <DetailRow label="SERVICE" value={displayData.service} />
                            <DetailRow label="SERVICE CATEGORY" value={displayData.service_category} />
                            <DetailRow label="FIRM" value={displayData.firm} />
                            <DetailRow label="FIRM OWNER" value={displayData.firm_owner} />
                            
                            {/* Status with dropdown */}
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="font-medium text-gray-700 text-sm">STATUS</span>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={selectedStatus || taskData.status || ''}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        disabled={isChangingStatus}
                                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
                                    >
                                        {statusOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.name}
                                            </option>
                                        ))}
                                    </select>
                                    {isChangingStatus && <FiLoader className="w-4 h-4 animate-spin text-blue-600" />}
                                </div>
                            </div>
                            
                            <DetailRow label="BILLING STATUS" value={displayData.billing_status} />
                            <DetailRow label="FEES" value={`₹${displayData.fees}`} />
                            <DetailRow label="TAX RATE" value={`${displayData.tax_rate}%`} />
                            <DetailRow label="IS RECURRING" value={displayData.is_recurring} />
                        </div>

                        {/* Right Column - Assignment Details */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-600 mb-4 pb-2 border-b">Assignment Details</h4>
                            <DetailRow label="DUE DATE" value={displayData.due_date} />
                            <DetailRow label="TARGET DATE" value={displayData.target_date} />
                            <DetailRow label="CREATE DATE" value={displayData.create_date} />
                            <DetailRow label="CREATED BY" value={displayData.created_by} />
                            <DetailRow label="MODIFIED BY" value={displayData.modified_by} />
                            <DetailRow label="CA" value={selectedCaDisplay?.name || (selectedCaDisplay?.username) || 'N/A'} />
                            <DetailRow label="AGENT" value={selectedAgentDisplay?.name || 'N/A'} />
                            <DetailRow label="HAS CA" value={displayData.has_ca} />
                            <DetailRow label="HAS AGENT" value={displayData.has_agent} />
                        </div>
                    </div>
                ) : (
                    // Edit Mode - Only editable fields enabled
                    <>
                        {/* Firms Section - Editable */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <FiUser className="w-4 h-4 text-blue-600" /> Firm (Editable)
                            </h4>
                            <div className="space-y-3">
                                {selectedFirmOptions.length === 0 ? (
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={firmSearchQuery}
                                            onChange={(e) => setFirmSearchQuery(e.target.value)}
                                            placeholder="Search firm to assign (min 3 characters)..."
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                        {firmSearchQuery.trim().length >= 3 && (
                                            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                {firmSearchLoading && <div className="p-3 text-sm text-gray-500 text-center">Searching...</div>}
                                                {!firmSearchLoading && firmSearchResults.length === 0 && <div className="p-3 text-sm text-gray-500 text-center">No firms found</div>}
                                                {!firmSearchLoading && firmSearchResults.map((opt) => (
                                                    <div
                                                        key={opt.value}
                                                        onClick={() => addFirm(opt)}
                                                        className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                                                    >
                                                        <div className="font-medium text-sm">{opt.label}</div>
                                                        <div className="text-xs text-gray-500">Owner: {opt.owner_name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div>
                                            <div className="font-medium text-gray-900">{selectedFirmOptions[0].label}</div>
                                            <div className="text-xs text-gray-500">Owner: {selectedFirmOptions[0].owner_name}</div>
                                        </div>
                                        <button
                                            onClick={removeFirm}
                                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                                        >
                                            <FiX className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Groups Section - View Only (Grayed out) */}
                        <div className="mb-6 p-4 bg-gray-100 rounded-lg opacity-75">
                            <h4 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                                <FiUsers className="w-4 h-4 text-gray-400" /> Groups (View Only)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedGroupOptions.map(opt => (
                                    <div key={opt.value} className="px-2 py-1 bg-gray-200 text-gray-500 rounded-lg text-sm">
                                        {opt.label}
                                    </div>
                                ))}
                                {selectedGroupOptions.length === 0 && (
                                    <span className="text-gray-400 text-sm">No groups assigned</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column - Editable Fields */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-blue-600 mb-4 pb-2 border-b">Editable Fields</h4>
                                
                                {/* Service - Editable */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="font-medium text-gray-700 text-sm">SERVICE</span>
                                    <select
                                        value={taskData.service?.service_id || ''}
                                        onChange={(e) => setTaskData(prev => ({
                                            ...prev,
                                            service: { ...prev.service, service_id: e.target.value }
                                        }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Select</option>
                                        {services.map(s => (
                                            <option key={s.service_id} value={s.service_id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Service Category - View Only */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-gray-50">
                                    <span className="font-medium text-gray-500 text-sm">SERVICE CATEGORY</span>
                                    <span className="text-gray-400">{displayData.service_category}</span>
                                </div>

                                {/* Fees - Editable */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="font-medium text-gray-700 text-sm">FEES (₹)</span>
                                    <input
                                        type="number"
                                        value={taskData.charges?.fees || 0}
                                        onChange={(e) => setTaskData(prev => ({
                                            ...prev,
                                            charges: { ...prev.charges, fees: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-24"
                                    />
                                </div>

                                {/* Tax Rate - Editable */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="font-medium text-gray-700 text-sm">TAX RATE (%)</span>
                                    <input
                                        type="number"
                                        value={taskData.charges?.tax_rate || 0}
                                        onChange={(e) => setTaskData(prev => ({
                                            ...prev,
                                            charges: { ...prev.charges, tax_rate: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-20"
                                    />
                                </div>

                                {/* Billing Status - View Only */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-gray-50">
                                    <span className="font-medium text-gray-500 text-sm">BILLING STATUS</span>
                                    <span className="text-gray-400">{displayData.billing_status}</span>
                                </div>

                                {/* Is Recurring - View Only */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-gray-50">
                                    <span className="font-medium text-gray-500 text-sm">IS RECURRING</span>
                                    <span className="text-gray-400">{displayData.is_recurring}</span>
                                </div>
                            </div>

                            {/* Right Column - Editable Fields */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-blue-600 mb-4 pb-2 border-b">Editable Fields</h4>
                                
                                {/* Due Date - Editable */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="font-medium text-gray-700 text-sm">DUE DATE</span>
                                    <input
                                        type="date"
                                        value={taskData.dates?.due_date ? formatDateForAPI(taskData.dates.due_date) : ''}
                                        onChange={(e) => setTaskData(prev => ({
                                            ...prev,
                                            dates: { ...prev.dates, due_date: e.target.value }
                                        }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>

                                {/* Target Date - Editable */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="font-medium text-gray-700 text-sm">TARGET DATE</span>
                                    <input
                                        type="date"
                                        value={taskData.dates?.target_date ? formatDateForAPI(taskData.dates.target_date) : ''}
                                        onChange={(e) => setTaskData(prev => ({
                                            ...prev,
                                            dates: { ...prev.dates, target_date: e.target.value }
                                        }))}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                
                                {/* CA Selection - Editable */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="font-medium text-gray-700 text-sm">CA</span>
                                    <div className="flex items-center gap-2">
                                        {selectedCaDisplay ? (
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="text-gray-900 font-medium">{selectedCaDisplay.name}</div>
                                                    {(selectedCaDisplay.email || selectedCaDisplay.mobile) && (
                                                        <div className="text-xs text-gray-500">
                                                            {selectedCaDisplay.email && <div>{selectedCaDisplay.email}</div>}
                                                            {selectedCaDisplay.mobile && <div>+{selectedCaDisplay.country_code || '91'} {selectedCaDisplay.mobile}</div>}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={handleCaClear}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Remove CA"
                                                >
                                                    <FiX className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={caSearchQuery}
                                                    onChange={(e) => setCaSearchQuery(e.target.value)}
                                                    placeholder="Search CA..."
                                                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                />
                                                {caSearchQuery.trim().length >= 3 && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[300px] max-h-80 overflow-y-auto">
                                                        {caSearchLoading && <div className="p-2 text-sm text-center">Searching...</div>}
                                                        {!caSearchLoading && caSearchResults.length === 0 && (
                                                            <div className="p-2 text-sm text-gray-500 text-center">No results</div>
                                                        )}
                                                        {!caSearchLoading && caSearchResults.map(item => (
                                                            <button
                                                                key={item.username}
                                                                onClick={() => handleCaSelect(item)}
                                                                className="w-full px-3 py-2.5 text-left text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                                                            >
                                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                                <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                                                                    {item.email && <div>{item.email}</div>}
                                                                    {item.mobile && <div>+{item.country_code || '91'} {item.mobile}</div>}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Agent Selection - Editable */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <span className="font-medium text-gray-700 text-sm">AGENT</span>
                                    <div className="flex items-center gap-2">
                                        {selectedAgentDisplay ? (
                                            <>
                                                <span className="text-gray-900">{selectedAgentDisplay.name}</span>
                                                <button
                                                    onClick={handleAgentClear}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <FiX className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={agentSearchQuery}
                                                    onChange={(e) => setAgentSearchQuery(e.target.value)}
                                                    placeholder="Search Agent..."
                                                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                />
                                                {agentSearchQuery.trim().length >= 3 && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px] max-h-60 overflow-y-auto">
                                                        {agentSearchLoading && <div className="p-2 text-sm text-center">Searching...</div>}
                                                        {!agentSearchLoading && agentSearchResults.length === 0 && (
                                                            <div className="p-2 text-sm text-gray-500 text-center">No results</div>
                                                        )}
                                                        {!agentSearchLoading && agentSearchResults.map(item => (
                                                            <button
                                                                key={item.username}
                                                                onClick={() => handleAgentSelect(item)}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                                                            >
                                                                <div className="font-medium">{item.name}</div>
                                                                {item.mobile && <div className="text-xs text-gray-500">{item.mobile}</div>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Create Date - View Only */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-gray-50">
                                    <span className="font-medium text-gray-500 text-sm">CREATE DATE</span>
                                    <span className="text-gray-400">{displayData.create_date}</span>
                                </div>

                                {/* Created By - View Only */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-gray-50">
                                    <span className="font-medium text-gray-500 text-sm">CREATED BY</span>
                                    <span className="text-gray-400">{displayData.created_by}</span>
                                </div>

                                {/* Modified By - View Only */}
                                <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-gray-50">
                                    <span className="font-medium text-gray-500 text-sm">MODIFIED BY</span>
                                    <span className="text-gray-400">{displayData.modified_by}</span>
                                </div>
                            </div>
                        </div>

                        {/* Staff Information - View Only (Grayed out) */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                                <FiUsers className="w-4 h-4 text-gray-400" /> Assigned Staff (View Only)
                            </h4>
                            <div className="bg-gray-100 rounded-lg p-4 opacity-75">
                                <div className="flex flex-wrap gap-2">
                                    {selectedEmployees.map(emp => (
                                        <div key={emp.username} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm">
                                            {emp.name}
                                        </div>
                                    ))}
                                    {selectedEmployees.length === 0 && (
                                        <span className="text-gray-400 text-sm">No staff assigned</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default DetailsTab;