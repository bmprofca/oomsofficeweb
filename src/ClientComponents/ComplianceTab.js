import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const ComplianceTab = ({ clientUsername }) => {
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

    // Status Modal states
    const [selectedPeriod, setSelectedPeriod] = useState(null);
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
        employee_username: '',
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

    // CA Search Autocomplete states
    const [caSearchQuery, setCaSearchQuery] = useState('');
    const [caSearchResults, setCaSearchResults] = useState([]);
    const [caSearchLoading, setCaSearchLoading] = useState(false);
    const [selectedCa, setSelectedCa] = useState(null);
    const [showCaDropdown, setShowCaDropdown] = useState(false);
    const caAbortRef = useRef(null);

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
                name: item.profile?.name ?? item.username
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

    // Initial load
    useEffect(() => {
        fetchComplianceData();
    }, [fetchComplianceData]);

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
    const openStatusModal = (period) => {
        setSelectedPeriod(period);
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
        const isGroup = assignForm.targetType === 'group';

        if (isSingle && !assignForm.firm_id) {
            toast.error('Please select a client firm');
            return;
        }
        if (isMultiple && (!assignForm.firms || assignForm.firms.length === 0)) {
            toast.error('Please select at least one firm');
            return;
        }
        if (isGroup && (!assignForm.groups || assignForm.groups.length === 0)) {
            toast.error('Please select at least one firm group');
            return;
        }
        if (!assignForm.service_id || !assignForm.custom_amount || !assignForm.employee_username) {
            toast.error('Please fill in all required fields (Service, Custom Fees, and Assigned Staff)');
            return;
        }

        setSubmittingAssign(true);
        try {
            const selectedService = globalServices.find(s => s.service_id === assignForm.service_id);
            const payload = {
                service_id: assignForm.service_id,
                financial_year: assignForm.financial_year,
                employee_username: assignForm.employee_username,
                employee_id: assignForm.employee_username,
                custom_amount: parseFloat(assignForm.custom_amount)
            };
            if (isSingle) {
                payload.firm_id = assignForm.firm_id;
            } else if (isMultiple) {
                payload.firms = assignForm.firms;
            } else if (isGroup) {
                payload.groups = assignForm.groups;
            }

            if (assignForm.ca_id) {
                payload.ca_id = assignForm.ca_id;
            }
            if (selectedService?.frequency === 'monthly' && assignForm.pay_from_month) {
                payload.pay_from_month = assignForm.pay_from_month;
            }
            if (selectedService?.frequency === 'quarterly' && assignForm.quarters?.length > 0) {
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
                    employee_username: '',
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
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Active Services', value: complianceData.active.length, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
                    { label: 'Pending Filings', value: complianceData.pending.length, color: 'text-amber-700 bg-amber-50 border-amber-100' },
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
                    { id: 'pending', label: 'Pending Actions', count: complianceData.pending.length },
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
                        <div className="overflow-hidden rounded-xl border border-slate-100">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[9px] font-bold tracking-wider">
                                        <th className="px-4 py-3">Service Name</th>
                                        <th className="px-4 py-3">Firm</th>
                                        <th className="px-4 py-3">Assigned Employee</th>
                                        <th className="px-4 py-3">Assigned CA</th>
                                        <th className="px-4 py-3">Fees</th>
                                        <th className="px-4 py-3">Start Date</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {complianceData.active.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                                                <FiBriefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                <p className="text-xs font-medium text-slate-500">No active compliance assignments</p>
                                                <p className="text-[10px] mt-0.5">Click "Assign Compliance" to set up filings for this client</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        complianceData.active.map((assign) => (
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
                                                        {assign.employee?.name || '—'}
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
                                                                {assign.employee && (
                                                                    <span className="text-[10px] text-slate-500 bg-white border border-slate-100 rounded-md px-2 py-1">
                                                                        Staff: <strong>{assign.employee.name}</strong>
                                                                    </span>
                                                                )}
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
                                                                        
                                                                        return filteredSchedules.map((period) => (
                                                                            <div
                                                                                key={period.schedule_id}
                                                                                onClick={() => openStatusModal(period)}
                                                                                className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between min-h-[85px] group"
                                                                            >
                                                                                <div className="flex items-start justify-between gap-1.5">
                                                                                    <span className="text-xs font-bold text-slate-700 leading-tight group-hover:text-indigo-600 truncate">
                                                                                        {period.period_name}
                                                                                    </span>
                                                                                    <FiInfo className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                                                                                </div>
                                                                                <div className="mt-2 space-y-1">
                                                                                    <span className="text-[10px] font-black text-slate-800 block">
                                                                                        ₹{formatCurrency(period.amount)}
                                                                                    </span>
                                                                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${STATUS_BADGES[period.status] || 'bg-slate-50'}`}>
                                                                                        {period.status}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ));
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
                        </div>
                    )}

                    {/* View 2: Pending Actions */}
                    {subTab === 'pending' && (
                        <div className="overflow-hidden rounded-xl border border-slate-100">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[9px] font-bold tracking-wider">
                                        <th className="px-4 py-3">Service Name</th>
                                        <th className="px-4 py-3">Period</th>
                                        <th className="px-4 py-3">Firm</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Assigned Employee</th>
                                        <th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {complianceData.pending.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                                                <FiCheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                                                <p className="text-xs font-semibold text-slate-700">All caught up!</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">No pending filing schedules for this client.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        complianceData.pending.map((p) => (
                                            <tr key={p.schedule_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                                                    {p.service_name}
                                                </td>
                                                <td className="px-4 py-3 text-indigo-600 font-bold text-xs">
                                                    {p.period_name} ({p.financial_year})
                                                </td>
                                                <td className="px-4 py-3 text-slate-650 text-xs font-medium">
                                                    {p.firm_name}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-700 text-xs">
                                                    ₹{formatCurrency(p.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">
                                                    {p.employee?.name || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => openStatusModal(p)}
                                                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                                    >
                                                        File / Update
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
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
                    <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 z-[200] backdrop-blur-xs overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8 overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
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

                            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                                {/* Target Type Selector */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To *</label>
                                    <div className="flex gap-2">
                                        {['single', 'multiple', 'group'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setAssignForm(prev => ({ ...prev, targetType: t }))}
                                                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${assignForm.targetType === t
                                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-705'
                                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {t === 'single' ? 'Single Firm' : t === 'multiple' ? 'Multiple Firms' : 'Firm Groups'}
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

                                {assignForm.targetType === 'group' && (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Firm Groups *</label>
                                        {groupsLoading ? (
                                            <div className="text-xs text-slate-400 p-2">Loading groups…</div>
                                        ) : groupsList.length === 0 ? (
                                            <div className="text-xs text-slate-500 p-2 border border-slate-200 rounded-xl bg-slate-50">No groups defined.</div>
                                        ) : (
                                            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 bg-white">
                                                {groupsList.map(g => (
                                                    <label key={g.group_id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={assignForm.groups?.includes(g.group_id)}
                                                            onChange={(e) => {
                                                                setAssignForm(prev => {
                                                                    const current = prev.groups || [];
                                                                    const updated = e.target.checked
                                                                        ? [...current, g.group_id]
                                                                        : current.filter(x => x !== g.group_id);
                                                                    return { ...prev, groups: updated };
                                                                });
                                                            }}
                                                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                                                        />
                                                        {g.name} ({g.firm_count || g.count || 0} firms)
                                                    </label>
                                                ))}
                                            </div>
                                        )}
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

                                {/* Assigned Staff */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Staff *</label>
                                    <select
                                        value={assignForm.employee_username}
                                        onChange={(e) => setAssignForm(prev => ({ ...prev, employee_username: e.target.value }))}
                                        className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                        required
                                    >
                                        <option value="">Select staff member…</option>
                                        {staffList.map(emp => (
                                            <option key={emp.username} value={emp.username}>{emp.name}</option>
                                        ))}
                                    </select>
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
                                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
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

                                {/* pay_from_month (for monthly frequency only) */}
                                {globalServices.find(s => s.service_id === assignForm.service_id)?.frequency?.toLowerCase() === 'monthly' && (
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
                                )}

                                {/* quarters (for quarterly frequency only) */}
                                {globalServices.find(s => s.service_id === assignForm.service_id)?.frequency?.toLowerCase() === 'quarterly' && (
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
                                )}

                                <div className="flex gap-2 pt-2 border-t border-slate-100">
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
                                            !assignForm.employee_username ||
                                            (assignForm.targetType === 'single' && !assignForm.firm_id) ||
                                            (assignForm.targetType === 'multiple' && (!assignForm.firms || assignForm.firms.length === 0)) ||
                                            (assignForm.targetType === 'group' && (!assignForm.groups || assignForm.groups.length === 0))
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
                {showStatusModal && selectedPeriod && (
                    <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 z-[200] backdrop-blur-xs overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm my-16 overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
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

                            <div className="bg-indigo-50 border-b border-indigo-100 p-4">
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
                                    {selectedPeriod.employee && (
                                        <p><strong>Assigned Staff:</strong> {selectedPeriod.employee.name} {selectedPeriod.employee.mobile ? `(${selectedPeriod.employee.mobile})` : ''}</p>
                                    )}
                                    {selectedPeriod.ca && (
                                        <p><strong>Assigned CA:</strong> {selectedPeriod.ca.name || selectedPeriod.ca.username}</p>
                                    )}
                                    {selectedPeriod.completed_by_user && (
                                        <p><strong>Completed By:</strong> {selectedPeriod.completed_by_user.name} on {new Date(selectedPeriod.completed_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleStatusSubmit} className="p-5 space-y-4">
                                {/* Select Status */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Status *</label>
                                    <select
                                        value={statusForm.status}
                                        onChange={(e) => setStatusForm(prev => ({ ...prev, status: e.target.value }))}
                                        className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="N/A">N/A</option>
                                        <option value="Sale">Sale (Posts to Client Ledger)</option>
                                        <option value="Outsource">Outsource</option>
                                    </select>
                                </div>

                                {/* Amount Field */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Fees Amount (₹) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={statusForm.amount}
                                        onChange={(e) => setStatusForm(prev => ({ ...prev, amount: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
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

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowStatusModal(false)}
                                        className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-250 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingStatus || !statusForm.amount}
                                        className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        {submittingStatus && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                        Update Period
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ComplianceTab;
