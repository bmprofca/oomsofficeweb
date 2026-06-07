import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiLayers, FiPlus, FiRefreshCw, FiCheckCircle, FiAlertCircle,
    FiChevronRight, FiChevronDown, FiCalendar, FiDollarSign, FiClock,
    FiX, FiInfo, FiSearch, FiBriefcase, FiUser, FiSliders
} from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import AssignedStaffList from '../components/Modals/AssignedStaffList';

const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const STATUS_BADGES = {
    'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'N/A': 'bg-slate-100 text-slate-500 border-slate-200',
    'Sale': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Outsource': 'bg-blue-100 text-blue-800 border-blue-200'
};

const FREQ_BADGES = {
    'monthly': 'bg-sky-50 text-sky-700 border-sky-200',
    'quarterly': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'halfyearly': 'bg-purple-50 text-purple-700 border-purple-200',
    'yearly': 'bg-violet-50 text-violet-700 border-violet-200'
};

const MONTH_MAP = {
    'Apr': 'April',
    'May': 'May',
    'Jun': 'June',
    'Jul': 'July',
    'Aug': 'August',
    'Sep': 'September',
    'Oct': 'October',
    'Nov': 'November',
    'Dec': 'December',
    'Jan': 'January',
    'Feb': 'February',
    'Mar': 'March'
};

const getPeriodDueDate = (period) => {
    if (!period) return '—';
    if (period.due_date) {
        return new Date(period.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
    const pName = period.period_name;
    const fy = period.financial_year || '2026-2027';
    const parts = fy.split('-');
    const startYear = parseInt(parts[0]) || 2026;
    const endYear = parseInt(parts[1]) || 2027;
    
    if (pName && MONTHS.includes(pName)) {
        const mIdx = MONTHS.indexOf(pName);
        const year = mIdx < 9 ? startYear : endYear;
        let dueYear = mIdx === 8 ? endYear : (mIdx > 8 ? endYear : startYear);
        const MONTH_NAMES = ['May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'];
        const dueDay = (period.service_id === 'GSTR-1' || /gstr-1/i.test(period.service_name || '')) ? 11 : 20;
        return `${dueDay} ${MONTH_NAMES[mIdx]} ${dueYear}`;
    }
    
    if (pName === 'Q1' || pName === '1Q') return `31 Jul ${startYear}`;
    if (pName === 'Q2' || pName === '2Q') return `31 Oct ${startYear}`;
    if (pName === 'Q3' || pName === '3Q') return `31 Jan ${endYear}`;
    if (pName === 'Q4' || pName === '4Q') return `30 Apr ${endYear}`;
    
    if (pName === 'Yearly' || pName === 'Year' || pName?.toLowerCase().includes('yearly')) return `31 Dec ${endYear}`;
    
    return '—';
};

const getPeriodHeaders = (frequency) => {
    const freq = frequency?.toLowerCase();
    if (freq === 'monthly') {
        return ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    }
    if (freq === 'quarterly') {
        return ['APR-JUN', 'JUL-SEP', 'OCT-DEC', 'JAN-MAR'];
    }
    if (freq === 'halfyearly') {
        return ['APR-SEP', 'OCT-MAR'];
    }
    if (freq === 'yearly') {
        return ['APR-MAR'];
    }
    return [];
};

const getPeriodSchedule = (assignmentSchedules, headerText, frequency) => {
    const freq = frequency?.toLowerCase();
    if (freq === 'monthly') {
        const fullMonthName = MONTH_MAP[headerText];
        return assignmentSchedules.find(p => p.period_name?.toLowerCase() === fullMonthName?.toLowerCase());
    }
    if (freq === 'quarterly') {
        if (headerText === 'APR-JUN') {
            return assignmentSchedules.find(p => ['q1', '1q', 'apr-jun'].includes(p.period_name?.toLowerCase()));
        }
        if (headerText === 'JUL-SEP') {
            return assignmentSchedules.find(p => ['q2', '2q', 'jul-sep'].includes(p.period_name?.toLowerCase()));
        }
        if (headerText === 'OCT-DEC') {
            return assignmentSchedules.find(p => ['q3', '3q', 'oct-dec'].includes(p.period_name?.toLowerCase()));
        }
        if (headerText === 'JAN-MAR') {
            return assignmentSchedules.find(p => ['q4', '4q', 'jan-mar'].includes(p.period_name?.toLowerCase()));
        }
    }
    if (freq === 'halfyearly') {
        if (headerText === 'APR-SEP') {
            return assignmentSchedules.find(p => ['h1', '1h', 'apr-sep'].includes(p.period_name?.toLowerCase()));
        }
        if (headerText === 'OCT-MAR') {
            return assignmentSchedules.find(p => ['h2', '2h', 'oct-mar'].includes(p.period_name?.toLowerCase()));
        }
    }
    if (freq === 'yearly') {
        return assignmentSchedules[0];
    }
    return null;
};

const ComplianceTab = ({ clientUsername }) => {
    const currentUsername = (localStorage.getItem('user_username') || '').toLowerCase().trim();
    const [subTab, setSubTab] = useState('active'); // 'active' | 'pending' | 'history'
    const [complianceData, setComplianceData] = useState({
        active: [],
        pending: [],
        history: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Selected active assignment for displaying expanded schedules
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [schedulesLoading, setSchedulesLoading] = useState(false);

    // Modals control
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [submittingAssign, setSubmittingAssign] = useState(false);
    const [submittingStatus, setSubmittingStatus] = useState(false);

    const [selectedServiceFilter, setSelectedServiceFilter] = useState('');
    const [selectedFilingStatus, setSelectedFilingStatus] = useState('');
    const [allSchedules, setAllSchedules] = useState([]);

    // Status Modal states
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [selectedPeriodAssign, setSelectedPeriodAssign] = useState(null);
    const [selectedStaffDetails, setSelectedStaffDetails] = useState(null);
    const [staffListModal, setStaffListModal] = useState({ open: false, staffs: [], serviceName: '' });
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);
    const [statusForm, setStatusForm] = useState({ status: 'Pending', amount: '' });

    // Assign Form states
    const [assignForm, setAssignForm] = useState({
        targetType: 'single',
        firm_id: '',
        firms: [],
        groups: [],
        service_id: '',
        financial_year: '2026-2027',
        custom_amount: '',
        employee_usernames: [],
        ca_id: '',
        pay_from_month: '',
        quarters: []
    });

    // Lists for assigning
    const [clientFirms, setClientFirms] = useState([]);
    const [globalServices, setGlobalServices] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [groupsList, setGroupsList] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(false);

    // Helper to extract assigned staff list
    const getAssignedStaffList = useCallback((assign) => {
        if (!assign) return [];
        if (assign.employees && Array.isArray(assign.employees)) {
            return assign.employees;
        }
        if (assign.employee) {
            return [assign.employee];
        }
        const usernamesStr = assign.employee_username || assign.employee_id || '';
        if (usernamesStr) {
            return String(usernamesStr).split(',').map(u => u.trim()).filter(Boolean).map(username => {
                const matched = staffList.find(s => s.username === username);
                return matched || { username, name: username };
            });
        }
        return [];
    }, [staffList]);

    // CA Search Autocomplete states
    const [caSearchQuery, setCaSearchQuery] = useState('');
    const [caSearchResults, setCaSearchResults] = useState([]);
    const [caSearchLoading, setCaSearchLoading] = useState(false);
    const [selectedCa, setSelectedCa] = useState(null);
    const [showCaDropdown, setShowCaDropdown] = useState(false);
    const caAbortRef = useRef(null);

    const filteredStaffResults = useMemo(() => {
        const query = staffSearchQuery.trim().toLowerCase();
        if (!query) return [];
        return staffList.filter(s =>
            (s.name || '').toLowerCase().includes(query) ||
            (s.username || '').toLowerCase().includes(query)
        );
    }, [staffList, staffSearchQuery]);

    // Fetch compliance details for client
    const fetchComplianceData = useCallback(async () => {
        if (!clientUsername) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}/client/details/profile`, {
                headers: getHeaders(),
                params: { username: clientUsername }
            });
            if (res.data?.success && res.data?.data?.compliance) {
                const compliance = res.data.data.compliance;
                setComplianceData({
                    active: compliance.active || [],
                    pending: compliance.pending || [],
                    history: compliance.history || []
                });
            } else {
                setComplianceData({ active: [], pending: [], history: [] });
            }
        } catch (err) {
            console.error('Error fetching client compliance details:', err);
            setError('Failed to load compliance details.');
        } finally {
            setLoading(false);
        }
    }, [clientUsername]);

    // Fetch schedules for an assignment
    const fetchAssignmentSchedules = useCallback(async (assignmentId) => {
        if (!assignmentId) return;
        setSchedulesLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/compliance/schedule`, {
                headers: getHeaders(),
                params: { assignment_id: assignmentId }
            });
            if (res.data?.success) {
                setSchedules(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching schedules for assignment:', err);
            toast.error('Failed to load period schedules.');
        } finally {
            setSchedulesLoading(false);
        }
    }, []);

    // Load static lists for assign modal
    const loadAssignModalDependencies = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) return;

        try {
            // 1. Fetch Client's Firms
            const firmsRes = await axios.get(`${API_BASE_URL}/client/details/firms/list?username=${clientUsername}`, { headers });
            if (firmsRes.data?.success && firmsRes.data?.data?.firms) {
                setClientFirms(firmsRes.data.data.firms.map(f => ({
                    firm_id: f.firm_id,
                    firm_name: f.firm_name,
                    gst_no: f.gst_no,
                    pan_no: f.pan_no
                })));
            }

            // 2. Fetch Global Compliance Predefined Services
            const servicesRes = await axios.get(`${API_BASE_URL}/compliance/services`, { headers });
            if (servicesRes.data?.success && servicesRes.data?.data) {
                setGlobalServices(servicesRes.data.data);
            }

            // 3. Fetch Staff Members list
            const staffBase = API_BASE_URL.replace(/\/$/, '');
            let page = 1;
            const limit = 100;
            const allStaff = [];
            for (; ;) {
                const res = await axios.get(`${staffBase}/settings/staff/list`, {
                    headers,
                    params: { search: '', page, limit }
                });
                const list = res.data?.data || [];
                allStaff.push(...list);
                if (res.data?.meta?.is_last_page || list.length < limit) break;
                page += 1;
            }
            setStaffList(allStaff.map(item => ({
                username: item.username,
                name: item.profile?.name ?? item.username,
                email: item.profile?.email ?? item.email ?? '—',
                mobile: item.profile?.mobile ?? item.profile?.phone ?? item.phone ?? '—'
            })));

            // 4. Fetch Active Groups
            setGroupsLoading(true);
            try {
                const groupsRes = await axios.get(`${API_BASE_URL}/group/list`, { headers });
                if (groupsRes.data?.success) {
                    setGroupsList(groupsRes.data.data || []);
                }
            } catch (gErr) {
                console.error('Failed to load firm groups:', gErr);
            } finally {
                setGroupsLoading(false);
            }
        } catch (err) {
            console.error('Failed to load assign options:', err);
            toast.error('Error loading setup options.');
        }
    }, [clientUsername]);

    const fetchAllSchedules = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/compliance/schedule`, {
                headers: getHeaders()
            });
            if (res.data?.success) {
                setAllSchedules(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching all schedules:', err);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchComplianceData();
        fetchAllSchedules();
    }, [fetchComplianceData, fetchAllSchedules]);

    // Open Assign modal & load dependencies
    const handleOpenAssignModal = () => {
        setShowAssignModal(true);
        loadAssignModalDependencies();
    };

    // Handle selecting assignment row to view schedules
    const handleSelectAssignment = (assignmentId) => {
        if (selectedAssignmentId === assignmentId) {
            setSelectedAssignmentId(null);
            setSchedules([]);
        } else {
            setSelectedAssignmentId(assignmentId);
            fetchAssignmentSchedules(assignmentId);
        }
    };

    // CA Search Effect
    useEffect(() => {
        const term = caSearchQuery.trim();
        if (term.length < 3) {
            setCaSearchResults([]);
            return;
        }

        const t = setTimeout(async () => {
            setCaSearchLoading(true);
            caAbortRef.current?.abort();
            const ctrl = new AbortController();
            caAbortRef.current = ctrl;

            try {
                const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/ca/search?search=${encodeURIComponent(term)}`, {
                    headers: getHeaders(),
                    signal: ctrl.signal
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    setCaSearchResults(data.data);
                } else {
                    setCaSearchResults([]);
                }
            } catch (e) {
                if (e?.name !== 'AbortError') setCaSearchResults([]);
            } finally {
                setCaSearchLoading(false);
            }
        }, 350);

        return () => {
            clearTimeout(t);
            caAbortRef.current?.abort();
        };
    }, [caSearchQuery]);

    // Open status update modal
    const openStatusModal = (period, assign = null) => {
        setSelectedPeriod(period);
        setSelectedPeriodAssign(assign);
        setStatusForm({
            status: period.status,
            amount: String(period.amount)
        });
        setShowStatusModal(true);
    };

    // Form Submissions
    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        const isSingle = assignForm.targetType === 'single';
        const isMultiple = assignForm.targetType === 'multiple';

        if (isSingle && !assignForm.firm_id) {
            toast.error('Please select a client firm');
            return;
        }
        if (isMultiple && (!assignForm.firms || assignForm.firms.length === 0)) {
            toast.error('Please select at least one firm');
            return;
        }
        if (!assignForm.service_id || !assignForm.custom_amount || (!assignForm.employee_usernames || assignForm.employee_usernames.length === 0)) {
            toast.error('Please fill in all required fields (Service, Custom Fees, and Assigned Staff)');
            return;
        }

        setSubmittingAssign(true);
        try {
            const selectedService = globalServices.find(s => s.service_id === assignForm.service_id);
            const isGstr1 = assignForm.service_id === 'GSTR-1' || (selectedService?.name && /gstr-1/i.test(selectedService.name));
            const effectiveFreq = isGstr1 ? 'monthly' : selectedService?.frequency?.toLowerCase();

            const payload = {
                service_id: assignForm.service_id,
                financial_year: assignForm.financial_year,
                employee_username: assignForm.employee_usernames,
                employee_id: assignForm.employee_usernames,
                custom_amount: parseFloat(assignForm.custom_amount)
            };
            if (isSingle) {
                payload.firm_id = assignForm.firm_id;
            } else if (isMultiple) {
                payload.firms = assignForm.firms;
            }

            if (assignForm.ca_id) {
                payload.ca_id = assignForm.ca_id;
            }
            if (effectiveFreq === 'monthly' && assignForm.pay_from_month) {
                payload.pay_from_month = assignForm.pay_from_month;
            }
            if (effectiveFreq === 'quarterly' && assignForm.quarters?.length > 0) {
                payload.quarters = assignForm.quarters;
            }

            const res = await axios.post(`${API_BASE_URL}/compliance/assign`, payload, {
                headers: getHeaders()
            });

            if (res.data?.success) {
                toast.success('Compliance service assigned successfully');
                setShowAssignModal(false);
                setAssignForm({
                    targetType: 'single',
                    firm_id: '',
                    firms: [],
                    groups: [],
                    service_id: '',
                    financial_year: '2026-2027',
                    custom_amount: '',
                    employee_usernames: [],
                    ca_id: '',
                    pay_from_month: '',
                    quarters: []
                });
                setSelectedCa(null);
                setCaSearchQuery('');
                fetchComplianceData();
            }
        } catch (err) {
            console.error('Error assigning compliance service:', err);
            toast.error(err.response?.data?.message || 'Failed to assign compliance service');
        } finally {
            setSubmittingAssign(false);
        }
    };

    const handleStatusSubmit = async (e) => {
        e.preventDefault();
        const currentUsername = (localStorage.getItem('user_username') || '').toLowerCase().trim();
        const assignedStaffs = getAssignedStaffList(selectedPeriodAssign || selectedPeriod);
        const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());

        if (currentUsername && assignedStaffUsernames.length > 0 && !assignedStaffUsernames.includes(currentUsername)) {
            const allowedNames = assignedStaffs.map(emp => emp.name || emp.username).join(', ');
            toast.error(`Only the assigned staff members (${allowedNames}) are permitted to update the payment status.`);
            return;
        }

        if (!statusForm.amount || isNaN(parseFloat(statusForm.amount))) {
            toast.error('Please enter a valid amount');
            return;
        }

        setSubmittingStatus(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/compliance/update-period-status`, {
                schedule_id: selectedPeriod.schedule_id,
                status: statusForm.status,
                amount: parseFloat(statusForm.amount)
            }, {
                headers: getHeaders()
            });

            if (res.data?.success) {
                toast.success('Period status updated successfully');
                setShowStatusModal(false);
                setSelectedPeriod(null);

                // Refresh data
                fetchComplianceData();
                fetchAllSchedules();
                if (selectedAssignmentId) {
                    fetchAssignmentSchedules(selectedAssignmentId);
                }
            }
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally {
            setSubmittingStatus(false);
        }
    };

    const filteredActiveAssignments = useMemo(() => {
        return complianceData.active.filter(assign => {
            const serviceMatch = selectedServiceFilter === '' ||
                String(assign.service_id) === String(selectedServiceFilter) ||
                String(assign.service_name) === String(selectedServiceFilter);

            const statusMatch = selectedFilingStatus === '' || (() => {
                const assignSchedules = allSchedules.filter(s => s.assignment_id === assign.assignment_id);
                return assignSchedules.some(s => s.status === selectedFilingStatus);
            })();

            return serviceMatch && statusMatch;
        });
    }, [complianceData.active, selectedServiceFilter, selectedFilingStatus, allSchedules]);

    const activeAssignmentForFreq = useMemo(() => {
        return complianceData.active.find(a => String(a.service_id) === String(selectedServiceFilter) || String(a.service_name) === String(selectedServiceFilter));
    }, [complianceData.active, selectedServiceFilter]);

    const activeFrequency = activeAssignmentForFreq ? activeAssignmentForFreq.frequency?.toLowerCase() : 'monthly';
    const isServiceFiltered = selectedServiceFilter !== '';
    const periodHeaders = isServiceFiltered ? getPeriodHeaders(activeFrequency) : [];

    const renderCell = (period, assign) => {
        if (!period) return <td key={Math.random()} className="px-2 py-3 text-center text-slate-350 font-mono">—</td>;
        
        let statusLetter = 'P';
        let cellClass = 'bg-amber-50 text-amber-700 border-amber-200';
        if (period.status === 'Sale') {
            statusLetter = 'S';
            cellClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (period.status === 'Outsource') {
            statusLetter = 'O';
            cellClass = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (period.status === 'N/A') {
            statusLetter = 'N';
            cellClass = 'bg-slate-50 text-slate-400 border-slate-200';
        }

        const dueDateText = getPeriodDueDate(period);
        const showDirectDueDate = selectedFilingStatus === '';

        const assignedStaffs = getAssignedStaffList(assign);
        const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());
        const isUpdatePermitted = !currentUsername || assignedStaffUsernames.length === 0 || assignedStaffUsernames.includes(currentUsername);

        return (
            <td key={period.schedule_id} className="px-2 py-2 text-center align-middle">
                <div 
                    onClick={() => isUpdatePermitted && openStatusModal(period, assign)}
                    className={`inline-flex items-center justify-center gap-1 min-w-[32px] h-[26px] rounded border text-[10px] font-bold select-none ${
                        isUpdatePermitted 
                            ? `cursor-pointer transition-all hover:scale-105 ${cellClass}`
                            : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                    }`}
                    title={
                        isUpdatePermitted 
                            ? (showDirectDueDate ? `Due Date: ${dueDateText}` : `Status: ${period.status}`)
                            : `Restricted (Only assigned staff: ${assignedStaffs.map(e => e.name || e.username).join(', ')})`
                    }
                >
                    <span className="px-1.5 h-full flex items-center justify-center flex-grow text-center">
                        {statusLetter}
                    </span>
                    {!showDirectDueDate && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                toast(`Due Date: ${dueDateText}`, { icon: '📅' });
                            }}
                            className="pr-1 text-amber-500 hover:text-amber-600 transition-colors shrink-0"
                            title="Click to view due date"
                        >
                            <FiAlertCircle className="w-3 h-3 animate-pulse" />
                        </button>
                    )}
                </div>
            </td>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-xl p-6"
        >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
                        <FiLayers className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                            Compliance Management
                        </h3>
                        <p className="text-xs text-slate-500">Track and assign global regulatory filings for this client</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchComplianceData}
                        className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 bg-white"
                        title="Reload"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <motion.button
                        onClick={handleOpenAssignModal}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-xs font-semibold"
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiPlus className="w-4 h-4" />
                        Assign Compliance
                    </motion.button>
                </div>
            </div>

            {/* Quick Metrics Dashboard */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                    { label: 'Active Services', value: complianceData.active.length, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
                    { label: 'History Records', value: complianceData.history.length, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' }
                ].map((item, idx) => (
                    <div key={idx} className={`rounded-xl border p-3 flex flex-col justify-between ${item.color}`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{item.label}</span>
                        <span className="text-lg sm:text-2xl font-black mt-1 tabular-nums">{item.value}</span>
                    </div>
                ))}
            </div>

            {/* Section Switcher Tabs */}
            <div className="flex border-b border-slate-100 mb-6 gap-1 bg-slate-50/50 p-1 rounded-xl">
                {[
                    { id: 'active', label: 'Active Assignments', count: complianceData.active.length },
                    { id: 'history', label: 'History & Archive', count: complianceData.history.length }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setSubTab(tab.id);
                            setSelectedAssignmentId(null);
                            setSchedules([]);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${subTab === tab.id
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${subTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Views */}
            {loading && complianceData.active.length === 0 && complianceData.pending.length === 0 && complianceData.history.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs font-medium">Fetching compliance database...</p>
                </div>
            ) : error ? (
                <div className="text-center py-8 text-rose-500">
                    <FiAlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs font-semibold">{error}</p>
                </div>
            ) : (
                <div className="min-h-[220px]">
                    {/* View 1: Active Assignments */}
                    {subTab === 'active' && (
                        <div className="space-y-4">
                            {/* Toolbar Filters */}
                            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border border-slate-100 rounded-xl bg-slate-50/20">
                                {/* Service Filter */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <span>Service:</span>
                                    <select
                                        value={selectedServiceFilter}
                                        onChange={(e) => {
                                            setSelectedServiceFilter(e.target.value);
                                            setSelectedAssignmentId(null);
                                        }}
                                        className="px-2 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-medium"
                                    >
                                        <option value="">All Services</option>
                                        {(() => {
                                            const uniqueServices = [];
                                            complianceData.active.forEach(assign => {
                                                if (assign.service_id && !uniqueServices.some(s => s.service_id === assign.service_id)) {
                                                    uniqueServices.push({ service_id: assign.service_id, name: assign.service_name });
                                                }
                                            });
                                            return uniqueServices.map(s => (
                                                <option key={s.service_id} value={s.service_id}>{s.name}</option>
                                            ));
                                        })()}
                                    </select>
                                </div>

                                {/* Filing Status Selector */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <span>Filing Status:</span>
                                    <select
                                        value={selectedFilingStatus}
                                        onChange={(e) => setSelectedFilingStatus(e.target.value)}
                                        className="px-2 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-medium"
                                    >
                                        <option value="">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Sale">Sale (Filed)</option>
                                        <option value="Outsource">Outsource</option>
                                        <option value="N/A">N/A</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-100">
                                {isServiceFiltered ? (
                                    <div className="min-w-[800px]">
                                        <table className="w-full text-sm text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-605 uppercase text-[9px] font-bold tracking-wider">
                                                    <th className="px-4 py-3 text-center w-12">SR</th>
                                                    <th className="px-4 py-3">Firm Name</th>
                                                    <th className="px-4 py-3 text-center">Staffs</th>
                                                    <th className="px-4 py-3 text-right pr-6">Amount</th>
                                                    {periodHeaders.map((header) => (
                                                        <th key={header} className="px-2 py-3 text-center uppercase tracking-wider">{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan={4 + periodHeaders.length} className="px-4 py-8 text-center">
                                                            <div className="animate-pulse flex flex-col gap-2">
                                                                <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto"></div>
                                                                <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto"></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredActiveAssignments.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4 + periodHeaders.length} className="px-4 py-12 text-center text-slate-400">
                                                            <FiBriefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                            <p className="text-xs font-medium text-slate-500">No matching active compliance assignments found</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredActiveAssignments.map((assign, idx) => {
                                                        const assignSchedules = allSchedules.filter(s => s.assignment_id === assign.assignment_id);
                                                        return (
                                                            <tr key={assign.assignment_id} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-4 py-3 text-center font-mono text-xs text-slate-400">
                                                                    {idx + 1}
                                                                </td>
                                                                <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                                                                    <div>{assign.firm_name}</div>
                                                                    <div className="text-[10px] text-slate-450 font-normal mt-0.5">{assign.service_name}</div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center align-middle">
                                                                    {(() => {
                                                                        const assignedStaffs = getAssignedStaffList(assign);
                                                                        if (assignedStaffs.length === 0) return '—';

                                                                        const onAvatarClick = (e) => {
                                                                            e.stopPropagation();
                                                                            setStaffListModal({
                                                                                open: true,
                                                                                staffs: assignedStaffs.map(emp => ({
                                                                                    username: emp.username,
                                                                                    name: emp.name || emp.username,
                                                                                    email: emp.email || '—',
                                                                                    mobile: emp.mobile || emp.phone || '—'
                                                                                })),
                                                                                serviceName: assign.service_name || assign.service_id
                                                                            });
                                                                        };

                                                                        return (
                                                                            <div className="flex justify-center -space-x-2.5">
                                                                                {assignedStaffs.slice(0, 2).map((emp, idx) => (
                                                                                    <button
                                                                                        key={emp.username || idx}
                                                                                        type="button"
                                                                                        onClick={onAvatarClick}
                                                                                        className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white hover:opacity-90 hover:scale-105 hover:z-10 transition-all shadow-xs cursor-pointer"
                                                                                        title={`Click to view details of assigned staff`}
                                                                                    >
                                                                                        {(emp.name || emp.username || 'S').charAt(0).toUpperCase()}
                                                                                    </button>
                                                                                ))}
                                                                                {assignedStaffs.length > 2 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={onAvatarClick}
                                                                                        className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white hover:opacity-90 hover:scale-105 hover:z-10 transition-all shadow-xs cursor-pointer"
                                                                                        title="Click to view all assigned staff"
                                                                                    >
                                                                                        +{assignedStaffs.length - 2}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-slate-705 text-xs text-right pr-6">
                                                                    ₹{formatCurrency(assign.custom_amount)}
                                                                </td>
                                                                {periodHeaders.map((headerText) => {
                                                                    const period = getPeriodSchedule(assignSchedules, headerText, activeFrequency);
                                                                    return renderCell(period, assign);
                                                                })}
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>

                                        {/* Footer Legend */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold text-slate-700">Filing Status Legend:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-4 font-medium">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded border bg-amber-50 text-amber-700 border-amber-200 flex items-center justify-center text-[10px] font-bold">P</span>
                                                    Pending
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center justify-center text-[10px] font-bold">S</span>
                                                    Sale (Filed)
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded border bg-blue-50 text-blue-700 border-blue-200 flex items-center justify-center text-[10px] font-bold">O</span>
                                                    Outsource
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded border bg-slate-50 text-slate-400 border-slate-200 flex items-center justify-center text-[10px] font-bold">N</span>
                                                    N/A
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                * Click status badge to update payment status
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[9px] font-bold tracking-wider">
                                                <th className="px-4 py-3">Service Name</th>
                                                <th className="px-4 py-3">Firm</th>
                                                <th className="px-4 py-3">STAFFS</th>
                                                <th className="px-4 py-3">Assigned CA</th>
                                                <th className="px-4 py-3">Fees</th>
                                                <th className="px-4 py-3">Start Date</th>
                                                <th className="px-4 py-3 w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredActiveAssignments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                                                        <FiBriefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                        <p className="text-xs font-medium text-slate-500">No active compliance assignments matching filters</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredActiveAssignments.map((assign) => (
                                                    <React.Fragment key={assign.assignment_id}>
                                                        <tr
                                                            onClick={() => handleSelectAssignment(assign.assignment_id)}
                                                            className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${selectedAssignmentId === assign.assignment_id ? 'bg-indigo-50/10' : ''}`}
                                                        >
                                                            <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                                                                <div>{assign.service_name}</div>
                                                                <div className="flex gap-1.5 mt-1">
                                                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${FREQ_BADGES[String(assign.frequency).toLowerCase()] || 'bg-slate-50'}`}>
                                                                        {assign.frequency}
                                                                    </span>
                                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono border bg-slate-50 text-slate-500">
                                                                        FY {assign.financial_year}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-650 text-xs font-medium">
                                                                {assign.firm_name}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600 text-xs">
                                                                {(() => {
                                                                    const assignedStaffs = getAssignedStaffList(assign);
                                                                    if (assignedStaffs.length === 0) return '—';

                                                                    const onAvatarClick = (e) => {
                                                                        e.stopPropagation();
                                                                        setStaffListModal({
                                                                            open: true,
                                                                            staffs: assignedStaffs.map(emp => ({
                                                                                username: emp.username,
                                                                                name: emp.name || emp.username,
                                                                                email: emp.email || '—',
                                                                                mobile: emp.mobile || emp.phone || '—'
                                                                            })),
                                                                            serviceName: assign.service_name || assign.service_id
                                                                        });
                                                                    };

                                                                    return (
                                                                        <div className="flex -space-x-2.5">
                                                                            {assignedStaffs.slice(0, 2).map((emp, idx) => (
                                                                                <button
                                                                                    key={emp.username || idx}
                                                                                    type="button"
                                                                                    onClick={onAvatarClick}
                                                                                    className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white hover:opacity-90 hover:scale-105 hover:z-10 transition-all shadow-xs cursor-pointer"
                                                                                    title={`Click to view details of assigned staff`}
                                                                                >
                                                                                    {(emp.name || emp.username || 'S').charAt(0).toUpperCase()}
                                                                                </button>
                                                                            ))}
                                                                            {assignedStaffs.length > 2 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={onAvatarClick}
                                                                                    className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white hover:opacity-90 hover:scale-105 hover:z-10 transition-all shadow-xs cursor-pointer"
                                                                                    title="Click to view all assigned staff"
                                                                                >
                                                                                    +{assignedStaffs.length - 2}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600 text-xs">
                                                                {assign.ca?.name || '—'}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold text-slate-700 text-xs">
                                                                ₹{formatCurrency(assign.custom_amount)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                                                                {assign.create_date ? new Date(assign.create_date).toLocaleDateString('en-IN') : '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {selectedAssignmentId === assign.assignment_id ? (
                                                                    <FiChevronDown className="w-4 h-4 text-slate-400" />
                                                                ) : (
                                                                    <FiChevronRight className="w-4 h-4 text-slate-400" />
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {/* Expanded Details - Schedules Grid */}
                                                        {selectedAssignmentId === assign.assignment_id && (
                                                            <tr>
                                                                <td colSpan={7} className="bg-slate-50/30 p-4 border-t border-b border-indigo-50">
                                                                    <div className="mb-3 flex justify-between items-center">
                                                                        <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                            Generated Schedules ({assign.financial_year})
                                                                        </h6>
                                                                        {(() => {
                                                                            const assignedStaffs = getAssignedStaffList(assign);
                                                                            if (assignedStaffs.length === 0) return null;
                                                                            return (
                                                                                <div className="flex flex-wrap gap-1 items-center">
                                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1">Staff:</span>
                                                                                    {assignedStaffs.map((emp, idx) => (
                                                                                        <button
                                                                                            key={emp.username || idx}
                                                                                            onClick={() => setSelectedStaffDetails(emp)}
                                                                                            className="text-[10px] text-slate-655 bg-white border border-slate-200 rounded-md px-2 py-0.5 hover:border-indigo-300 hover:text-indigo-650 transition-colors font-medium shadow-2xs cursor-pointer"
                                                                                        >
                                                                                            {emp.name}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    {schedulesLoading ? (
                                                                        <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                                                                            <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                                                                            Loading periods...
                                                                        </div>
                                                                    ) : (
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                                                            {(() => {
                                                                                const filteredSchedules = (() => {
                                                                                    const normalizeFY = (fy) => {
                                                                                        if (!fy) return '';
                                                                                        let clean = fy.toLowerCase().replace(/fy/g, '').trim().replace(/\s+/g, '');
                                                                                        const parts = clean.split('-');
                                                                                        if (parts.length !== 2) return fy;
                                                                                        let start = parts[0].length === 2 ? '20' + parts[0] : parts[0];
                                                                                        let end = parts[1].length === 2 ? '20' + parts[1] : parts[1];
                                                                                        return start.length === 4 && end.length === 4 ? `${start}-${end}` : fy;
                                                                                    };

                                                                                    const targetFY = normalizeFY(assign.financial_year);
                                                                                    let list = schedules.filter(p => normalizeFY(p.financial_year) === targetFY);

                                                                                    if (!assign.pay_from_month || assign.frequency !== 'monthly') return list;
                                                                                    const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                                                                                    const startIndex = MONTHS.indexOf(assign.pay_from_month);
                                                                                    if (startIndex === -1) return list;
                                                                                    return list.filter(p => {
                                                                                        const pIndex = MONTHS.indexOf(p.period_name);
                                                                                        return pIndex >= startIndex;
                                                                                    });
                                                                                })();

                                                                                return filteredSchedules.map((period) => {
                                                                                    const assignedStaffs = getAssignedStaffList(assign);
                                                                                    const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());
                                                                                    const isUpdatePermitted = !currentUsername || assignedStaffUsernames.length === 0 || assignedStaffUsernames.includes(currentUsername);

                                                                                    return (
                                                                                        <div
                                                                                            key={period.schedule_id}
                                                                                            onClick={() => isUpdatePermitted && openStatusModal(period, assign)}
                                                                                            className={`border rounded-xl p-3 shadow-xs transition-all flex flex-col justify-between min-h-[90px] group ${
                                                                                                isUpdatePermitted
                                                                                                    ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer"
                                                                                                    : "bg-slate-50/50 border-slate-200/60 opacity-60 cursor-not-allowed"
                                                                                            }`}
                                                                                            title={isUpdatePermitted ? undefined : `Restricted (Only assigned staff: ${assignedStaffs.map(e => e.name || e.username).join(', ')})`}
                                                                                        >
                                                                                            <div className="flex items-start justify-between gap-1.5">
                                                                                                <span className={`text-xs font-bold leading-tight truncate ${
                                                                                                    isUpdatePermitted ? "text-slate-700 group-hover:text-indigo-600" : "text-slate-400"
                                                                                                }`}>
                                                                                                    {period.period_name}
                                                                                                </span>
                                                                                                <FiInfo className={`w-3 h-3 shrink-0 ${
                                                                                                    isUpdatePermitted ? "text-slate-300 group-hover:text-indigo-400" : "text-slate-200"
                                                                                                }`} />
                                                                                            </div>
                                                                                            <div className="mt-2 space-y-1">
                                                                                                <span className={`text-[10px] font-black block ${
                                                                                                    isUpdatePermitted ? "text-slate-800" : "text-slate-400"
                                                                                                }`}>
                                                                                                    ₹{formatCurrency(period.amount)}
                                                                                                </span>
                                                                                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                                                                                                    isUpdatePermitted 
                                                                                                        ? (STATUS_BADGES[period.status] || 'bg-slate-50')
                                                                                                        : 'bg-slate-100/70 border-slate-200/50 text-slate-400'
                                                                                                }`}>
                                                                                                    {period.status}
                                                                                                </span>
                                                                                                {selectedFilingStatus === '' ? (
                                                                                                    <div className="text-[9px] text-slate-400 font-mono mt-1">
                                                                                                        Due: {getPeriodDueDate(period)}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="flex items-center gap-1 mt-1 justify-between">
                                                                                                        <span className="text-[9px] text-slate-400">Due Date</span>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                toast(`Due Date: ${getPeriodDueDate(period)}`, { icon: '📅' });
                                                                                                            }}
                                                                                                            className="text-amber-500 hover:text-amber-600 transition-colors"
                                                                                                            title="Click to view due date"
                                                                                                        >
                                                                                                            <FiAlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                });
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}



                    {/* View 3: History & Archive */}
                    {subTab === 'history' && (
                        <div className="overflow-hidden rounded-xl border border-slate-100">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[9px] font-bold tracking-wider">
                                        <th className="px-4 py-3">Service Name</th>
                                        <th className="px-4 py-3">Period</th>
                                        <th className="px-4 py-3">Firm</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Invoice Number</th>
                                        <th className="px-4 py-3">Completed By</th>
                                        <th className="px-4 py-3">Completed Date/Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {complianceData.history.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                                                <FiClock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                <p className="text-xs font-medium text-slate-500">No filing history logged yet</p>
                                                <p className="text-[10px] mt-0.5">Historical and completed items appear here once marked</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        complianceData.history.map((hist) => (
                                            <tr key={hist.schedule_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                                                    {hist.service_name}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 text-xs font-bold">
                                                    {hist.period_name} ({hist.financial_year})
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">
                                                    {hist.firm_name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${STATUS_BADGES[hist.status] || 'bg-slate-50'}`}>
                                                        {hist.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-700 text-xs">
                                                    ₹{formatCurrency(hist.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 text-xs font-mono">
                                                    {hist.status === 'Sale' && hist.invoice_no ? (
                                                        <a
                                                            href="/billing"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                window.location.href = `/billing`;
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-850 hover:underline font-semibold font-mono"
                                                        >
                                                            {hist.invoice_no}
                                                        </a>
                                                    ) : (
                                                        <span>—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs font-semibold">
                                                    {hist.completed_by_user?.name || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                                                    {formatDateTime(hist.completed_at)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Assign Compliance Service */}
            <AnimatePresence>
                {showAssignModal && (
                    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                        <div 
                            className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
                            onClick={() => setShowAssignModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 20 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
                                <div className="flex items-center gap-2">
                                    <FiLayers className="w-5 h-5" />
                                    <h3 className="text-sm font-bold">Assign Compliance to Client</h3>
                                </div>
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAssignSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                                <div 
                                    className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                {/* Target Type Selector */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To *</label>
                                    <div className="flex gap-2">
                                        {['single', 'multiple'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setAssignForm(prev => ({ ...prev, targetType: t }))}
                                                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${assignForm.targetType === t
                                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-705'
                                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {t === 'single' ? 'Single Firm' : 'Multiple Firms'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Target selection */}
                                {assignForm.targetType === 'single' && (
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Client Firm *</label>
                                        <select
                                            value={assignForm.firm_id}
                                            onChange={(e) => setAssignForm(prev => ({ ...prev, firm_id: e.target.value }))}
                                            className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                            required
                                        >
                                            <option value="">Select one of client's firms…</option>
                                            {clientFirms.map(f => (
                                                <option key={f.firm_id} value={f.firm_id}>{f.firm_name} (PAN: {f.pan_no || '—'})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {assignForm.targetType === 'multiple' && (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Client Firms *</label>
                                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 bg-white">
                                            {clientFirms.length === 0 ? (
                                                <div className="text-xs text-slate-400">No client firms found.</div>
                                            ) : (
                                                clientFirms.map(f => (
                                                    <label key={f.firm_id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer animate-fade-in">
                                                        <input
                                                            type="checkbox"
                                                            checked={assignForm.firms?.includes(f.firm_id)}
                                                            onChange={(e) => {
                                                                setAssignForm(prev => {
                                                                    const current = prev.firms || [];
                                                                    const updated = e.target.checked
                                                                        ? [...current, f.firm_id]
                                                                        : current.filter(x => x !== f.firm_id);
                                                                    return { ...prev, firms: updated };
                                                                });
                                                            }}
                                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                                                        />
                                                        {f.firm_name} {f.pan_no ? `(PAN: ${f.pan_no})` : ''}
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Compliance Service Select */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Compliance Service *</label>
                                    <select
                                        value={assignForm.service_id}
                                        onChange={(e) => {
                                            const svcId = e.target.value;
                                            const matched = globalServices.find(s => s.service_id === svcId);
                                            setAssignForm(prev => ({
                                                ...prev,
                                                service_id: svcId,
                                                custom_amount: matched ? String(matched.default_amount) : ''
                                            }));
                                        }}
                                        className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                        required
                                    >
                                        <option value="">Select compliance template…</option>
                                        {globalServices.map(s => (
                                            <option key={s.id} value={s.service_id}>{s.name} (₹{formatCurrency(s.default_amount)})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* pay_from_month (for monthly frequency only) */}
                                {(() => {
                                    const selectedService = globalServices.find(s => s.service_id === assignForm.service_id);
                                    const isGstr1 = assignForm.service_id === 'GSTR-1' || (selectedService?.name && /gstr-1/i.test(selectedService.name));
                                    const effectiveFreq = isGstr1 ? 'monthly' : selectedService?.frequency?.toLowerCase();
                                    return effectiveFreq === 'monthly' && (
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Start Generating From Month (Optional)</label>
                                            <select
                                                value={assignForm.pay_from_month}
                                                onChange={(e) => setAssignForm(prev => ({ ...prev, pay_from_month: e.target.value }))}
                                                className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                            >
                                                <option value="">Default (April)</option>
                                                {['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'].map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })()}

                                {/* quarters (for quarterly frequency only) */}
                                {(() => {
                                    const selectedService = globalServices.find(s => s.service_id === assignForm.service_id);
                                    const isGstr1 = assignForm.service_id === 'GSTR-1' || (selectedService?.name && /gstr-1/i.test(selectedService.name));
                                    const effectiveFreq = isGstr1 ? 'monthly' : selectedService?.frequency?.toLowerCase();
                                    return effectiveFreq === 'quarterly' && (
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Quarters (Optional)</label>
                                            <div className="flex gap-4">
                                                {[1, 2, 3, 4].map(q => {
                                                    const checked = assignForm.quarters?.includes(q);
                                                    return (
                                                        <label key={q} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    setAssignForm(prev => {
                                                                        const current = prev.quarters || [];
                                                                        const updated = e.target.checked
                                                                            ? [...current, q]
                                                                            : current.filter(x => x !== q);
                                                                        return { ...prev, quarters: updated };
                                                                    });
                                                                }}
                                                                className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                            />
                                                            Q{q}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-slate-400">Leave unselected to generate all quarters.</p>
                                        </div>
                                    );
                                })()}

                                {/* Financial Year */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Year *</label>
                                    <select
                                        value={assignForm.financial_year}
                                        onChange={(e) => setAssignForm(prev => ({ ...prev, financial_year: e.target.value }))}
                                        className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                    >
                                        <option value="2025-2026">2025-2026</option>
                                        <option value="2026-2027">2026-2027</option>
                                        <option value="2027-2028">2027-2028</option>
                                    </select>
                                </div>

                                {/* Custom Amount */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Fees Amount (₹) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={assignForm.custom_amount}
                                        onChange={(e) => setAssignForm(prev => ({ ...prev, custom_amount: e.target.value }))}
                                        className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                        required
                                    />
                                </div>

                                {/* Assigned Staff Selector */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Staff *</label>
                                        {assignForm.employee_usernames?.length > 0 && (
                                            <span className="text-[10px] font-semibold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                {assignForm.employee_usernames.length} selected
                                            </span>
                                        )}
                                    </div>
                                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                                        {/* Filter input */}
                                        <div className="relative border-b border-slate-100 px-3 py-2 bg-slate-50">
                                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Filter staff list..."
                                                value={staffSearchQuery}
                                                onChange={(e) => setStaffSearchQuery(e.target.value)}
                                                className="w-full pl-6 pr-2 py-1 text-xs text-slate-700 bg-transparent outline-none placeholder-slate-400 focus:ring-0"
                                            />
                                        </div>
                                        <div className="max-h-36 overflow-y-auto p-3 space-y-2">
                                            {(() => {
                                                const query = staffSearchQuery.trim().toLowerCase();
                                                const filtered = query
                                                    ? staffList.filter(s =>
                                                        (s.name || '').toLowerCase().includes(query) ||
                                                        (s.username || '').toLowerCase().includes(query)
                                                      )
                                                    : staffList;

                                                if (filtered.length === 0) {
                                                    return <div className="text-xs text-slate-400">No staff members found.</div>;
                                                }

                                                return filtered.map(s => {
                                                    const checked = assignForm.employee_usernames?.includes(s.username);
                                                    return (
                                                        <label key={s.username} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer animate-fade-in hover:text-slate-900">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    setAssignForm(prev => {
                                                                        const current = prev.employee_usernames || [];
                                                                        const updated = e.target.checked
                                                                            ? [...current, s.username]
                                                                            : current.filter(x => x !== s.username);
                                                                        return { ...prev, employee_usernames: updated };
                                                                    });
                                                                }}
                                                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                                                            />
                                                            <span className="font-medium">{s.name}</span>
                                                            <span className="text-[10px] text-slate-400">({s.username})</span>
                                                        </label>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned CA */}
                                <div className="space-y-1 relative">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned CA (Optional)</label>
                                    {selectedCa ? (
                                        <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{selectedCa.name}</p>
                                                <p className="text-[10px] text-slate-400">Username: {selectedCa.username} · PAN: {selectedCa.pan_no || '—'}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCa(null);
                                                    setAssignForm(prev => ({ ...prev, ca_id: '' }));
                                                }}
                                                className="text-slate-400 hover:text-slate-650 p-1 rounded-md"
                                            >
                                                <FiX className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={caSearchQuery}
                                                onChange={(e) => {
                                                    setCaSearchQuery(e.target.value);
                                                    setShowCaDropdown(true);
                                                }}
                                                onFocus={() => setShowCaDropdown(true)}
                                                placeholder="Search CA (min 3 chars)…"
                                                className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                            />
                                            {showCaDropdown && caSearchResults.length > 0 && (
                                                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                                    {caSearchResults.map(c => (
                                                        <button
                                                            key={c.username}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCa(c);
                                                                setAssignForm(prev => ({ ...prev, ca_id: c.username }));
                                                                setCaSearchQuery('');
                                                                setCaSearchResults([]);
                                                                setShowCaDropdown(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs flex flex-col"
                                                        >
                                                            <span className="font-semibold text-slate-800">{c.name}</span>
                                                            <span className="text-[10px] text-slate-400 mt-0.5">Username: {c.username}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                </div>
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            submittingAssign ||
                                            !assignForm.service_id ||
                                            !assignForm.custom_amount ||
                                            (!assignForm.employee_usernames || assignForm.employee_usernames.length === 0) ||
                                            (assignForm.targetType === 'single' && !assignForm.firm_id) ||
                                            (assignForm.targetType === 'multiple' && (!assignForm.firms || assignForm.firms.length === 0))
                                        }
                                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        {submittingAssign && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                        Confirm Assignment
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Update Schedule Period Status */}
            <AnimatePresence>
                {showStatusModal && selectedPeriod && (() => {
                    const currentUsername = (localStorage.getItem('user_username') || '').toLowerCase().trim();
                    const assignedStaffs = getAssignedStaffList(selectedPeriodAssign || selectedPeriod);
                    const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());
                    const isUpdatePermitted = !currentUsername || assignedStaffUsernames.length === 0 || assignedStaffUsernames.includes(currentUsername);

                    return (
                        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                            <div 
                                className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
                                onClick={() => setShowStatusModal(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97, y: 20 }}
                                className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-sm my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
                                    <div className="flex items-center gap-2">
                                        <FiCalendar className="w-5 h-5" />
                                        <h3 className="text-sm font-bold">Update Period Status</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowStatusModal(false)}
                                        className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="bg-indigo-50 border-b border-indigo-100 p-4 shrink-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold">Current Period</p>
                                            <h4 className="text-xs font-bold text-slate-800 mt-0.5">{selectedPeriod.period_name}</h4>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${STATUS_BADGES[selectedPeriod.status] || 'bg-slate-50'}`}>
                                            {selectedPeriod.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 mt-3 bg-white/70 border border-indigo-100/50 rounded-xl p-3 text-slate-700 text-[11px] font-medium leading-relaxed">
                                        {assignedStaffs.length > 0 && (
                                            <p className="flex flex-wrap items-center gap-1">
                                                <strong>Assigned Staff:</strong>
                                                {assignedStaffs.map((emp, idx) => (
                                                    <span key={emp.username || idx} className="inline-flex items-center gap-0.5">
                                                        <span
                                                            onClick={() => setSelectedStaffDetails(emp)}
                                                            className="text-indigo-600 hover:underline cursor-pointer font-bold"
                                                        >
                                                            {emp.name}
                                                        </span>
                                                        {emp.mobile ? <span className="text-slate-400">({emp.mobile})</span> : ''}
                                                        {idx < assignedStaffs.length - 1 ? <span className="text-slate-300">,</span> : ''}
                                                    </span>
                                                ))}
                                            </p>
                                        )}
                                        {selectedPeriod.ca && (
                                            <p><strong>Assigned CA:</strong> {selectedPeriod.ca.name || selectedPeriod.ca.username}</p>
                                        )}
                                        {selectedPeriod.completed_by_user && (
                                            <p><strong>Completed By:</strong> {selectedPeriod.completed_by_user.name} on {new Date(selectedPeriod.completed_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                                        )}
                                    </div>
                                </div>

                                <form onSubmit={handleStatusSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                                    <div 
                                        className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        {!isUpdatePermitted && (
                                            <div className="flex gap-2.5 bg-rose-50 border border-rose-150 rounded-xl p-3 text-rose-800 animate-pulse">
                                                <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                                                <p className="text-[10px] leading-relaxed font-semibold">
                                                    Restricted: Only the assigned staff member ({assignedStaffs.map(emp => emp.name || emp.username).join(', ')}) can update the payment/status of this period.
                                                </p>
                                            </div>
                                        )}

                                        {/* Select Status */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Status *</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { value: 'Pending', label: 'Pending', badge: 'P', color: 'border-amber-200 hover:border-amber-300 text-amber-700 bg-amber-50/10', activeColor: 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-200' },
                                                    { value: 'Sale', label: 'Sale (Filed)', badge: 'S', color: 'border-emerald-200 hover:border-emerald-300 text-emerald-700 bg-emerald-50/10', activeColor: 'bg-emerald-500 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-200' },
                                                    { value: 'Outsource', label: 'Outsource', badge: 'O', color: 'border-blue-200 hover:border-blue-300 text-blue-700 bg-blue-50/10', activeColor: 'bg-blue-500 text-white border-blue-500 shadow-sm ring-2 ring-blue-200' },
                                                    { value: 'N/A', label: 'N/A', badge: 'N', color: 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50/10', activeColor: 'bg-slate-500 text-white border-slate-500 shadow-sm ring-2 ring-slate-200' }
                                                ].map((opt) => {
                                                    const isSelected = statusForm.status === opt.value;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            disabled={!isUpdatePermitted}
                                                            onClick={() => setStatusForm(prev => ({ ...prev, status: opt.value }))}
                                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                isSelected ? opt.activeColor : `bg-white ${opt.color}`
                                                            }`}
                                                        >
                                                            <span className="text-lg font-black tracking-wider mb-1">{opt.badge}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">{opt.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Amount Field */}
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Fees Amount (₹) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={statusForm.amount}
                                                disabled={!isUpdatePermitted}
                                                onChange={(e) => setStatusForm(prev => ({ ...prev, amount: e.target.value }))}
                                                placeholder="0.00"
                                                className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Ledger notice info */}
                                        {statusForm.status === 'Sale' && (
                                            <div className="flex gap-2.5 bg-emerald-50 border border-emerald-150 rounded-xl p-3 text-emerald-800">
                                                <FiCheckCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-600" />
                                                <p className="text-[10.5px] leading-relaxed font-medium">
                                                    Updating status to <strong>Sale</strong> will automatically generate a sales invoice and post it to this client firm's ledger.
                                                </p>
                                            </div>
                                        )}
                                        {selectedPeriod.status === 'Sale' && statusForm.status !== 'Sale' && (
                                            <div className="flex gap-2.5 bg-amber-50 border border-amber-150 rounded-xl p-3 text-amber-800">
                                                <FiAlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-650" />
                                                <p className="text-[10.5px] leading-relaxed font-medium">
                                                    Changing status away from <strong>Sale</strong> will automatically delete and reverse the posted ledger entry for this period.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowStatusModal(false)}
                                            className="flex-1 py-2 text-xs font-semibold text-slate-605 border border-slate-250 rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submittingStatus || !statusForm.amount || !isUpdatePermitted}
                                            className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            {submittingStatus && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                            Update Period
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* Modal: Staff Details Popup */}
            <AnimatePresence>
                {selectedStaffDetails && (
                    <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                        <div 
                            className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
                            onClick={() => setSelectedStaffDetails(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-100 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
                                <div className="flex items-center gap-2">
                                    <FiUser className="w-5 h-5" />
                                    <h3 className="text-sm font-bold">Staff Details</h3>
                                </div>
                                <button
                                    onClick={() => setSelectedStaffDetails(null)}
                                    className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 flex flex-col items-center flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-inner border border-indigo-200 shrink-0">
                                    {selectedStaffDetails.name ? selectedStaffDetails.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 mb-1">{selectedStaffDetails.name || 'N/A'}</h4>
                                <p className="text-xs text-slate-400 font-mono mb-4">@{selectedStaffDetails.username || 'N/A'}</p>

                                <div className="w-full space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700">
                                    <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                                        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Mobile</span>
                                        <span className="font-bold text-slate-800">{selectedStaffDetails.mobile || selectedStaffDetails.phone || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                                        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Email</span>
                                        <span className="font-bold text-slate-850 break-all">{selectedStaffDetails.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Role</span>
                                        <span className="font-bold text-indigo-650 uppercase text-[10px] tracking-wide bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                            {selectedStaffDetails.role || 'Staff'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                                <button
                                    onClick={() => setSelectedStaffDetails(null)}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-705 rounded-xl shadow-xs transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AssignedStaffList
                isOpen={staffListModal.open}
                onClose={() => setStaffListModal({ open: false, staffs: [], serviceName: '' })}
                users={staffListModal.staffs}
                taskName={staffListModal.serviceName}
            />
        </motion.div>
    );
};

export default ComplianceTab;
