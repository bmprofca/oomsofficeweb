import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FiSearch, FiPlus, FiRefreshCw, FiCheckCircle, FiAlertCircle,
    FiLayers, FiChevronRight, FiChevronDown, FiDollarSign, FiCheck,
    FiX, FiEye, FiInfo, FiBookOpen, FiBriefcase, FiCalendar, FiArrowRight
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';

/* ─── Helpers ────────────────────────────────────────────────────── */
const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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

const ComplianceServices = () => {
    // Layout states
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('sidebarMinimized')) || false;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Tab control: 'assignments' or 'services'
    const [activeTab, setActiveTab] = useState('assignments');

    // Predefined Services list states
    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [serviceSearch, setServiceSearch] = useState('');

    // Assignments states
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [assignmentSearch, setAssignmentSearch] = useState('');
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

    // Period schedules states
    const [schedules, setSchedules] = useState([]);
    const [schedulesLoading, setSchedulesLoading] = useState(false);

    // Modals control
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [submittingAssign, setSubmittingAssign] = useState(false);
    const [submittingStatus, setSubmittingStatus] = useState(false);

    // Status Modal target period
    const [selectedPeriod, setSelectedPeriod] = useState(null); // { schedule_id, period_name, status, amount }
    const [statusForm, setStatusForm] = useState({ status: 'Pending', amount: '' });

    // Assign Form states
    const [assignForm, setAssignForm] = useState({
        firm_id: '',
        service_id: '',
        financial_year: '2026-2027',
        custom_amount: ''
    });

    // Searchable Firm Dropdown states
    const [firmSearchQuery, setFirmSearchQuery] = useState('');
    const [firmSearchResults, setFirmSearchResults] = useState([]);
    const [firmSearchLoading, setFirmSearchLoading] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [showFirmDropdown, setShowFirmDropdown] = useState(false);
    const [selectedFY, setSelectedFY] = useState('2026-2027');
    const firmAbortRef = useRef(null);

    // Filter assignments inline
    const filteredAssignments = assignments.filter(assign =>
        selectedFY === '' || assign.financial_year === selectedFY
    );

    // Dynamic stats
    const [stats, setStats] = useState({
        totalAssigned: 0,
        activeServices: 0,
        totalSalesAmount: 0,
        pendingActions: 0
    });

    // Fetch Predefined Services
    const fetchServices = useCallback(async (search = '') => {
        setServicesLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/compliance/services`, {
                headers: getHeaders(),
                params: { search }
            });
            if (res.data?.success) {
                setServices(res.data.data || []);
                // Update active services count
                setStats(prev => ({ ...prev, activeServices: res.data.data?.length || 0 }));
            }
        } catch (err) {
            console.error('Error fetching compliance services:', err);
            toast.error('Failed to load compliance services');
        } finally {
            setServicesLoading(false);
        }
    }, []);

    // Fetch Assignments
    const fetchAssignments = useCallback(async (search = '') => {
        setAssignmentsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/compliance/assignments`, {
                headers: getHeaders(),
                params: { search }
            });
            if (res.data?.success) {
                const list = res.data.data || [];
                setAssignments(list);

                // Calculate dynamic metrics
                const total = list.length;
                setStats(prev => ({ ...prev, totalAssigned: total }));
            }
        } catch (err) {
            console.error('Error fetching assignments:', err);
            toast.error('Failed to load assignments');
        } finally {
            setAssignmentsLoading(false);
        }
    }, []);

    // Fetch schedules for selected assignment
    const fetchSchedules = useCallback(async (assignmentId) => {
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
            console.error('Error fetching schedules:', err);
            toast.error('Failed to load schedules');
        } finally {
            setSchedulesLoading(false);
        }
    }, []);

    // Load initial data
    useEffect(() => {
        fetchServices();
        fetchAssignments();

        // Fetch all schedules to compute total sales amount and pending counts
        const fetchAllStats = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/compliance/schedule`, {
                    headers: getHeaders()
                });
                if (res.data?.success) {
                    const allSchedules = res.data.data || [];
                    const salesAmount = allSchedules
                        .filter(s => s.status === 'Sale')
                        .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                    const pendingCount = allSchedules.filter(s => s.status === 'Pending').length;

                    setStats(prev => ({
                        ...prev,
                        totalSalesAmount: salesAmount,
                        pendingActions: pendingCount
                    }));
                }
            } catch (err) {
                console.error('Error calculating compliance schedules stats:', err);
            }
        };
        fetchAllStats();
    }, [fetchServices, fetchAssignments]);

    // Handle service search change
    useEffect(() => {
        const t = setTimeout(() => {
            fetchServices(serviceSearch);
        }, 400);
        return () => clearTimeout(t);
    }, [serviceSearch, fetchServices]);

    // Handle assignment search change
    useEffect(() => {
        const t = setTimeout(() => {
            fetchAssignments(assignmentSearch);
        }, 400);
        return () => clearTimeout(t);
    }, [assignmentSearch, fetchAssignments]);

    // Handle firm search autocomplete
    useEffect(() => {
        const term = firmSearchQuery.trim();
        if (term.length < 3) {
            setFirmSearchResults([]);
            return;
        }

        const t = setTimeout(async () => {
            setFirmSearchLoading(true);
            firmAbortRef.current?.abort();
            const ctrl = new AbortController();
            firmAbortRef.current = ctrl;

            try {
                const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/firm/search?search=${encodeURIComponent(term)}`, {
                    headers: getHeaders(),
                    signal: ctrl.signal
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    setFirmSearchResults(data.data.map(f => ({
                        id: f.firm_id,
                        name: f.firm_name,
                        client_name: f.client?.name || '',
                        pan_no: f.pan_no || f.client?.pan_number || ''
                    })));
                } else {
                    setFirmSearchResults([]);
                }
            } catch (e) {
                if (e?.name !== 'AbortError') setFirmSearchResults([]);
            } finally {
                setFirmSearchLoading(false);
            }
        }, 350);

        return () => {
            clearTimeout(t);
            firmAbortRef.current?.abort();
        };
    }, [firmSearchQuery]);

    // Handle selecting a firm in dropdown
    const handleSelectFirm = (firm) => {
        setSelectedFirm(firm);
        setAssignForm(prev => ({ ...prev, firm_id: firm.id }));
        setFirmSearchQuery('');
        setFirmSearchResults([]);
        setShowFirmDropdown(false);
    };

    // Handle assignment selection to view schedules
    const handleSelectAssignment = (assignmentId) => {
        if (selectedAssignmentId === assignmentId) {
            setSelectedAssignmentId(null);
            setSchedules([]);
        } else {
            setSelectedAssignmentId(assignmentId);
            fetchSchedules(assignmentId);
        }
    };

    // Open status update modal
    const openStatusModal = (period) => {
        setSelectedPeriod(period);
        setStatusForm({
            status: period.status,
            amount: String(period.amount)
        });
        setShowStatusModal(true);
    };

    // Submit Assign Form
    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!assignForm.firm_id || !assignForm.service_id || !assignForm.custom_amount) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmittingAssign(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/compliance/assign`, assignForm, {
                headers: getHeaders()
            });

            if (res.data?.success) {
                toast.success('Compliance service assigned successfully');
                setShowAssignModal(false);
                setAssignForm({
                    firm_id: '',
                    service_id: '',
                    financial_year: '2026-2027',
                    custom_amount: ''
                });
                setSelectedFirm(null);
                fetchAssignments();
            }
        } catch (err) {
            console.error('Error assigning service:', err);
            toast.error(err.response?.data?.message || 'Failed to assign compliance service');
        } finally {
            setSubmittingAssign(false);
        }
    };

    // Submit Status Update Form
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

                // Refresh schedules and assignments to update ledger & stats
                fetchSchedules(selectedAssignmentId);
                fetchAssignments();

                // Refresh main stats
                const statsRes = await axios.get(`${API_BASE_URL}/compliance/schedule`, { headers: getHeaders() });
                if (statsRes.data?.success) {
                    const allSchedules = statsRes.data.data || [];
                    const salesAmount = allSchedules
                        .filter(s => s.status === 'Sale')
                        .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                    const pendingCount = allSchedules.filter(s => s.status === 'Pending').length;

                    setStats(prev => ({
                        ...prev,
                        totalSalesAmount: salesAmount,
                        pendingActions: pendingCount
                    }));
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
        <div className="min-h-screen bg-slate-50">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

                    {/* Page Title */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
                                <FiLayers className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 leading-tight">Compliance Services</h1>
                                <p className="text-xs text-slate-500">Manage client regulatory schedules, assignment frequencies, and automatic ledger sales</p>
                            </div>
                        </div>
                        {activeTab === 'assignments' && (
                            <motion.button
                                onClick={() => setShowAssignModal(true)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-xs font-semibold"
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FiPlus className="w-4 h-4" />
                                Assign Compliance Service
                            </motion.button>
                        )}
                    </div>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Assigned Entities', value: stats.totalAssigned, color: 'bg-blue-500', icon: FiBriefcase },
                            { label: 'Compliance Services', value: stats.activeServices, color: 'bg-indigo-500', icon: FiLayers },
                            { label: 'Total Sales Posted', value: `₹${formatCurrency(stats.totalSalesAmount)}`, color: 'bg-emerald-500', icon: FiDollarSign },
                            { label: 'Pending Periods', value: stats.pendingActions, color: 'bg-amber-500', icon: FiAlertCircle }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">{item.label}</span>
                                    <span className="text-sm sm:text-lg font-bold text-slate-800 mt-1 block">{item.value}</span>
                                </div>
                                <div className={`w-8 h-8 rounded-lg ${item.color} bg-opacity-10 flex items-center justify-center text-slate-700`}>
                                    <item.icon className="w-4.5 h-4.5" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Workspace Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
                        {/* Tab Switcher */}
                        <div className="flex border-b border-slate-100 px-4 pt-3 gap-1 bg-slate-50/55">
                            {[
                                { id: 'assignments', label: 'Client Assignments', icon: <FiBriefcase className="w-3.5 h-3.5" /> },
                                { id: 'services', label: 'Predefined Services', icon: <FiBookOpen className="w-3.5 h-3.5" /> }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setSelectedAssignmentId(null);
                                        setSchedules([]);
                                    }}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all -mb-px ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Assignments Workspace */}
                        {activeTab === 'assignments' && (
                            <div>
                                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/20">
                                    <div className="relative flex-1 max-w-xs">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search assignments or firms…"
                                            value={assignmentSearch}
                                            onChange={(e) => setAssignmentSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        />
                                    </div>

                                    {/* Financial Year Selector */}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                        <span>FY:</span>
                                        <select
                                            value={selectedFY}
                                            onChange={(e) => setSelectedFY(e.target.value)}
                                            className="px-2 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        >
                                            <option value="">All Years</option>
                                            <option value="2025-2026">2025-2026</option>
                                            <option value="2026-2027">2026-2027</option>
                                            <option value="2027-2028">2027-2028</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => fetchAssignments(assignmentSearch)}
                                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 bg-white"
                                    >
                                        <FiRefreshCw className={`w-3.5 h-3.5 ${assignmentsLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                                                <th className="px-4 py-3">Firm Name</th>
                                                <th className="px-4 py-3">Compliance Service</th>
                                                <th className="px-4 py-3">Frequency</th>
                                                <th className="px-4 py-3">FY</th>
                                                <th className="px-4 py-3">Amount</th>
                                                <th className="px-4 py-3 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {assignmentsLoading ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center">
                                                        <div className="animate-pulse flex flex-col gap-2">
                                                            <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto"></div>
                                                            <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredAssignments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                                        <FiBriefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-xs font-medium text-slate-500">No compliance assignments found</p>
                                                        <p className="text-[11px] mt-0.5">Click "Assign Compliance Service" above to link a firm</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAssignments.map((assign) => (
                                                    <React.Fragment key={assign.assignment_id}>
                                                        <tr
                                                            onClick={() => handleSelectAssignment(assign.assignment_id)}
                                                            className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${selectedAssignmentId === assign.assignment_id ? 'bg-indigo-50/20' : ''
                                                                }`}
                                                        >
                                                            <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                                                                {assign.firm_name}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600 text-xs">
                                                                {assign.service_name}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${FREQ_BADGES[String(assign.frequency).toLowerCase()] || 'bg-slate-50'
                                                                    }`}>
                                                                    {assign.frequency}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                                                                {assign.financial_year}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold text-slate-700 text-xs">
                                                                ₹{formatCurrency(assign.custom_amount)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1">
                                                                    {selectedAssignmentId === assign.assignment_id ? (
                                                                        <FiChevronDown className="w-4 h-4" />
                                                                    ) : (
                                                                        <FiChevronRight className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* Expanded Schedule Details */}
                                                        {selectedAssignmentId === assign.assignment_id && (
                                                            <tr>
                                                                <td colSpan={6} className="bg-slate-50/40 p-4 border-t border-b border-indigo-100/50">
                                                                    <h6 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                                                                        Schedule Details for {assign.financial_year}
                                                                    </h6>

                                                                    {schedulesLoading ? (
                                                                        <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
                                                                            <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                                                                            Loading periods…
                                                                        </div>
                                                                    ) : (
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                                                            {schedules.map((period) => (
                                                                                <div
                                                                                    key={period.schedule_id}
                                                                                    onClick={() => openStatusModal(period)}
                                                                                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between min-h-[90px] group"
                                                                                >
                                                                                    <div className="flex items-start justify-between gap-1.5">
                                                                                        <span className="text-xs font-semibold text-slate-700 leading-tight group-hover:text-indigo-600 truncate">
                                                                                            {period.period_name}
                                                                                        </span>
                                                                                        <FiInfo className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                                                                                    </div>
                                                                                    <div className="mt-2.5 space-y-1.5">
                                                                                        <span className="text-[11px] font-bold text-slate-800 block">
                                                                                            ₹{formatCurrency(period.amount)}
                                                                                        </span>
                                                                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${STATUS_BADGES[period.status] || 'bg-slate-50'
                                                                                            }`}>
                                                                                            {period.status}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
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
                            </div>
                        )}

                        {/* Predefined Global Services Tab */}
                        {activeTab === 'services' && (
                            <div>
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/20">
                                    <div className="relative flex-1 max-w-xs">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search global catalog…"
                                            value={serviceSearch}
                                            onChange={(e) => setServiceSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => fetchServices(serviceSearch)}
                                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 bg-white"
                                    >
                                        <FiRefreshCw className={`w-3.5 h-3.5 ${servicesLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                <div className="p-4 bg-indigo-50/50 border-b border-slate-100 flex items-start gap-3">
                                    <FiInfo className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                                        Compliance services represent globally predefined operations configured with frequencies and default amounts. To register or create new compliance templates, insert entries directly in the database using SQL commands.
                                    </p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                                                <th className="px-4 py-3">ID</th>
                                                <th className="px-4 py-3">Service Name</th>
                                                <th className="px-4 py-3">SAC Code</th>
                                                <th className="px-4 py-3">Frequency</th>
                                                <th className="px-4 py-3">Default Fee</th>
                                                <th className="px-4 py-3">Remark</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {servicesLoading ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center">
                                                        <div className="animate-pulse flex flex-col gap-2">
                                                            <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto"></div>
                                                            <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : services.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                                        <FiLayers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-xs font-medium text-slate-500">No compliance services found</p>
                                                        <p className="text-[11px] mt-0.5">Define compliance services in the database to see them listed</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                services.map((svc) => (
                                                    <tr key={svc.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3 font-semibold text-slate-800 text-xs font-mono">
                                                            {svc.service_id}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-700 text-xs font-semibold">
                                                            {svc.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                                                            {svc.sac_code || '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${FREQ_BADGES[String(svc.frequency).toLowerCase()] || 'bg-slate-50'
                                                                }`}>
                                                                {svc.frequency}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-700 text-xs">
                                                            ₹{formatCurrency(svc.default_amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px]" title={svc.remark || undefined}>
                                                            {svc.remark || '—'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

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
                                    <h3 className="text-sm font-bold">Assign Compliance Service</h3>
                                </div>
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
                                {/* Searchable Firm Dropdown */}
                                <div className="space-y-1 relative">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Client Firm *</label>
                                    {selectedFirm ? (
                                        <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{selectedFirm.name}</p>
                                                <p className="text-[10px] text-slate-400">Client: {selectedFirm.client_name} · PAN: {selectedFirm.pan_no}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedFirm(null)}
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
                                                value={firmSearchQuery}
                                                onChange={(e) => {
                                                    setFirmSearchQuery(e.target.value);
                                                    setShowFirmDropdown(true);
                                                }}
                                                onFocus={() => setShowFirmDropdown(true)}
                                                placeholder="Search client firm (min 3 chars)…"
                                                className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                            />
                                            {showFirmDropdown && firmSearchResults.length > 0 && (
                                                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                                    {firmSearchResults.map(f => (
                                                        <button
                                                            key={f.id}
                                                            type="button"
                                                            onClick={() => handleSelectFirm(f)}
                                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs flex flex-col"
                                                        >
                                                            <span className="font-semibold text-slate-800">{f.name}</span>
                                                            <span className="text-[10px] text-slate-400 mt-0.5">Client: {f.client_name} · PAN: {f.pan_no}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Compliance Service Select */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Compliance Service *</label>
                                    <select
                                        value={assignForm.service_id}
                                        onChange={(e) => {
                                            const svcId = e.target.value;
                                            const matched = services.find(s => s.service_id === svcId);
                                            setAssignForm(prev => ({
                                                ...prev,
                                                service_id: svcId,
                                                custom_amount: matched ? String(matched.default_amount) : ''
                                            }));
                                        }}
                                        className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                    >
                                        <option value="">Select compliance template…</option>
                                        {services.map(s => (
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
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-250 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingAssign || !assignForm.firm_id || !assignForm.service_id || !assignForm.custom_amount}
                                        className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
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
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${STATUS_BADGES[selectedPeriod.status] || 'bg-slate-50'
                                        }`}>
                                        {selectedPeriod.status}
                                    </span>
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
                                        <FiAlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600" />
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
        </div>
    );
};

export default ComplianceServices;
