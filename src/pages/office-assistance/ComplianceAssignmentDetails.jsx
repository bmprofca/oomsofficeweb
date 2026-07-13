import React, {
    useState,
    useEffect,
    useCallback,
    useMemo
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FiArrowLeft, FiRefreshCw, FiCheckCircle, FiAlertCircle,
    FiLayers, FiChevronRight, FiChevronDown, FiDollarSign,
    FiX, FiInfo, FiBriefcase, FiCalendar, FiUser, FiShare2, FiLock, FiEye, FiEyeOff, FiCopy
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';
import { MdEmail } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import { useUserPermissions } from '../../utils/permission-helper';

/* ─── Helpers & Configurations ────────────────────────────────────── */
const STATUS_BADGES = {
    'Pending From The Department': 'bg-amber-100 text-amber-800 border-amber-200',
    'Pending From Client': 'bg-orange-100 text-orange-800 border-orange-200',
    'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'Complete': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Sale': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'N/A': 'bg-slate-100 text-slate-500 border-slate-200',
    'Cancel': 'bg-rose-100 text-rose-800 border-rose-200',
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

const isQ1 = (name) => {
    const n = name?.toLowerCase() || '';
    return n.includes('q1') || n.includes('1q') || n.includes('apr-jun') || n.includes('apr - jun') || n.includes('quarter 1') || n.includes('quarter-1') || n.includes('quarter_1') || n.includes('1st quarter');
};
const isQ2 = (name) => {
    const n = name?.toLowerCase() || '';
    return n.includes('q2') || n.includes('2q') || n.includes('jul-sep') || n.includes('jul - sep') || n.includes('quarter 2') || n.includes('quarter-2') || n.includes('quarter_2') || n.includes('2nd quarter');
};
const isQ3 = (name) => {
    const n = name?.toLowerCase() || '';
    return n.includes('q3') || n.includes('3q') || n.includes('oct-dec') || n.includes('oct - dec') || n.includes('quarter 3') || n.includes('quarter-3') || n.includes('quarter_3') || n.includes('3rd quarter');
};
const isQ4 = (name) => {
    const n = name?.toLowerCase() || '';
    return n.includes('q4') || n.includes('4q') || n.includes('jan-mar') || n.includes('jan - mar') || n.includes('quarter 4') || n.includes('quarter-4') || n.includes('quarter_4') || n.includes('4th quarter');
};

const isH1 = (name) => {
    const n = name?.toLowerCase() || '';
    return n.includes('h1') || n.includes('1h') || n.includes('apr-sep') || n.includes('apr - sep') || n.includes('half yearly 1') || n.includes('half-yearly-1');
};
const isH2 = (name) => {
    const n = name?.toLowerCase() || '';
    return n.includes('h2') || n.includes('2h') || n.includes('oct-mar') || n.includes('oct - mar') || n.includes('half yearly 2') || n.includes('half-yearly-2');
};

const getPeriodDueDate = (period, assignment = null) => {
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
        let dueYear = mIdx === 8 ? endYear : (mIdx > 8 ? endYear : startYear);
        const MONTH_NAMES = ['May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'];
        const dueDay = (period.service_id === 'gstr-1' || period.service_id === 'gstr-1-regular-monthly' || (assignment && /gstr-1/i.test(assignment.service_name || ''))) ? 11 : 20;
        return `${dueDay} ${MONTH_NAMES[mIdx]} ${dueYear}`;
    }

    if (isQ1(pName)) return `31 Jul ${startYear}`;
    if (isQ2(pName)) return `31 Oct ${startYear}`;
    if (isQ3(pName)) return `31 Jan ${endYear}`;
    if (isQ4(pName)) return `30 Apr ${endYear}`;

    if (pName === 'Yearly' || pName === 'Year' || pName?.toLowerCase().includes('yearly')) return `31 Dec ${endYear}`;

    return '—';
};

const isPeriodDueDateActive = (period, assignment = null) => {
    if (!period) return false;
    let dueDateObj = null;
    if (period.due_date) {
        dueDateObj = new Date(period.due_date);
    } else {
        const dateStr = getPeriodDueDate(period, assignment);
        if (dateStr && dateStr !== '—') {
            dueDateObj = new Date(dateStr);
        }
    }
    if (!dueDateObj || isNaN(dueDateObj.getTime())) return false;
    const today = new Date();
    const todayCopy = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfDueDateMonth = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), 1);
    return todayCopy >= startOfDueDateMonth;
};

const getPeriodDueDateStatus = (period, assignment = null) => {
    if (!period) return { text: '—', color: 'text-slate-500' };

    const dueDateText = getPeriodDueDate(period, assignment);
    if (dueDateText === '—') {
        return { text: '—', color: 'text-slate-500' };
    }

    const isComplete = period.status === 'Complete' || period.status === 'Sale';
    if (isComplete) {
        return { text: `Due: ${dueDateText}`, color: 'text-slate-500' };
    }

    let dueDateObj = null;
    if (period.due_date) {
        dueDateObj = new Date(period.due_date);
    } else {
        dueDateObj = new Date(dueDateText);
    }

    if (!dueDateObj || isNaN(dueDateObj.getTime())) {
        return { text: `Due: ${dueDateText}`, color: 'text-slate-500' };
    }

    const today = new Date();
    const todayCopy = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueDateCopy = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());

    const diffTime = todayCopy.getTime() - dueDateCopy.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const isOverdue = diffDays > 0;

    const startOfDueDateMonth = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), 1);
    const hasMonthStarted = todayCopy >= startOfDueDateMonth;
    const isMonthRunning = today.getMonth() === dueDateObj.getMonth() && today.getFullYear() === dueDateObj.getFullYear();

    if (hasMonthStarted) {
        if (isOverdue) {
            return {
                text: `Due Date Passed (${diffDays} days)`,
                color: 'text-rose-600 font-bold',
                isOverdue: true
            };
        } else if (isMonthRunning) {
            const daysRemaining = -diffDays;
            return {
                text: `${daysRemaining} Days Remaining for due`,
                color: 'text-amber-600 font-bold',
                daysRemaining
            };
        }
    }

    return { text: `Due: ${dueDateText}`, color: 'text-slate-500' };
};

const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const getRequiredFieldsForService = (service) => {
    if (!service) return [];
    const name = (service.name || '').toLowerCase();
    const svcId = (service.service_id || '').toLowerCase();
    if (name.includes('professional tax') || name.includes('ptax') || svcId.includes('ptax') || svcId.includes('professional-tax')) {
        return [
            { key: 'ptax_reg_no', label: 'Professional Tax Reg No', type: 'text' },
            { key: 'ptax_password', label: 'Password', type: 'password' }
        ];
    }
    if (name.includes('gstr-1') || svcId.includes('gstr-1') || name.includes('gstr1') || svcId.includes('gstr1') ||
        name.includes('gstr-3b') || svcId.includes('gstr-3b') || name.includes('gstr3b') || svcId.includes('gstr3b')) {
        return [
            { key: 'gst_login_id', label: 'GST Login ID', type: 'text' },
            { key: 'gst_password', label: 'Password', type: 'password' }
        ];
    }
    return [];
};

const CredentialRow = ({ label, val, type }) => {
    const [visible, setVisible] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(val || '');
        toast.success(`${label} copied to clipboard`);
    };

    const isPassword = type === 'password' || label.toLowerCase().includes('pass') || label.toLowerCase().includes('secret');

    return (
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-xs">
            <span className="font-semibold text-slate-500 w-1/3 truncate" title={label}>{label}</span>
            <div className="flex items-center gap-2 w-2/3 justify-end">
                <span className="font-mono text-slate-800 break-all select-all font-semibold">
                    {!val ? '—' : (isPassword && !visible ? '••••••••' : val)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setVisible(!visible)}
                            className="p-1 hover:bg-slate-150 rounded text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            {visible ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="p-1 hover:bg-slate-150 rounded text-slate-400 hover:text-slate-700 transition-colors"
                        title="Copy to Clipboard"
                    >
                        <FiCopy className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const CredentialsCard = ({ schema, credentials }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm w-full md:max-w-xs shrink-0 self-start">
            <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <FiLock className="w-3.5 h-3.5 text-indigo-500" /> Client Filing Credentials
            </h5>
            <div className="divide-y divide-slate-50">
                {schema.map(field => {
                    const val = credentials[field.key];
                    return (
                        <CredentialRow
                            key={field.key}
                            label={field.label}
                            val={val}
                            type={field.type}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const ClientFilingCredentials = ({ assignment }) => {
    const credentials = assignment.custom_fields || {};

    let schema = getRequiredFieldsForService(assignment);
    if (schema.length === 0 && Object.keys(credentials).length > 0) {
        schema = Object.keys(credentials).map(key => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const type = (key.toLowerCase().includes('pass') || key.toLowerCase().includes('secret')) ? 'password' : 'text';
            return { key, label, type };
        });
    }

    if (schema.length === 0) {
        return null;
    }

    return <CredentialsCard schema={schema} credentials={credentials} />;
};

/* ─── Main Component ──────────────────────────────────────────────── */
const ComplianceAssignmentDetails = () => {
    const { assignment_id } = useParams();
    const navigate = useNavigate();
    const { check } = useUserPermissions();

    const currentUsername = (localStorage.getItem('user_username') || '').toLowerCase().trim();
    const isBranchOwner = localStorage.getItem('branch_owned') === 'true';
    const isAdmin = currentUsername === 'admin';

    // Sidebar & layout states
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

    // Data States
    const [assignment, setAssignment] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [schedulesLoading, setSchedulesLoading] = useState(false);

    // Accordion State: { [year]: boolean }
    const [expandedYears, setExpandedYears] = useState({});

    // Modals States
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [statusForm, setStatusForm] = useState({ status: '', amount: '' });
    const [submittingStatus, setSubmittingStatus] = useState(false);

    const [shareModal, setShareModal] = useState({ open: false, period: null, assign: null });
    const [sharePhone, setSharePhone] = useState('');
    const [shareEmail, setShareEmail] = useState('');

    const [selectedStaffDetails, setSelectedStaffDetails] = useState(null);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);

    // Fetch schedules
    const fetchSchedules = useCallback(async (id) => {
        if (!id) return;
        setSchedulesLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/recurring-task/schedule`, {
                headers: getHeaders(),
                params: { assignment_id: id }
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

    // Load data
    const loadDetails = useCallback(async () => {
        if (!assignment_id) return;
        setLoading(true);
        try {
            // Fetch assignments to extract specific one
            const res = await axios.get(`${API_BASE_URL}/recurring-task/assignments`, {
                headers: getHeaders()
            });
            if (res.data?.success) {
                const list = res.data.data || [];
                const found = list.find(a => String(a.assignment_id) === String(assignment_id));
                if (found) {
                    setAssignment(found);
                    await fetchSchedules(assignment_id);
                } else {
                    toast.error('Compliance task assignment not found');
                }
            }
        } catch (err) {
            console.error('Error loading details:', err);
            toast.error('Failed to load compliance details');
        } finally {
            setLoading(false);
        }
    }, [assignment_id, fetchSchedules]);

    useEffect(() => {
        loadDetails();
    }, [loadDetails]);

    // Parse Staff lists
    const getAssignedStaffList = useCallback((item) => {
        if (!item) return [];
        if (item.assigned_staffs && Array.isArray(item.assigned_staffs)) {
            return item.assigned_staffs;
        }
        if (item.employee_usernames && Array.isArray(item.employee_usernames)) {
            return item.employee_usernames.map(u => ({ username: u, name: u }));
        }
        return [];
    }, []);

    // Group Schedules Year-Wise
    const groupedSchedules = useMemo(() => {
        const groups = {};
        schedules.forEach(period => {
            const fy = period.financial_year || 'Unknown';
            if (!groups[fy]) {
                groups[fy] = [];
            }
            groups[fy].push(period);
        });

        // Sort inside each year
        Object.keys(groups).forEach(fy => {
            groups[fy].sort((a, b) => {
                const freq = assignment?.frequency?.toLowerCase();
                if (freq === 'monthly') {
                    const MONTH_ORDER = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                    return MONTH_ORDER.indexOf(a.period_name) - MONTH_ORDER.indexOf(b.period_name);
                }
                if (freq === 'quarterly') {
                    const getQIdx = (name) => {
                        if (isQ1(name)) return 0;
                        if (isQ2(name)) return 1;
                        if (isQ3(name)) return 2;
                        if (isQ4(name)) return 3;
                        return -1;
                    };
                    return getQIdx(a.period_name) - getQIdx(b.period_name);
                }
                if (freq === 'halfyearly') {
                    const getHIdx = (name) => {
                        if (isH1(name)) return 0;
                        if (isH2(name)) return 1;
                        return -1;
                    };
                    return getHIdx(a.period_name) - getHIdx(b.period_name);
                }
                return 0;
            });
        });

        // Set initial expanded states to expand the newest year if not set yet
        const years = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        if (years.length > 0 && Object.keys(expandedYears).length === 0) {
            const initialExpanded = {};
            years.forEach((y, idx) => {
                initialExpanded[y] = idx === 0; // expand first year by default
            });
            setExpandedYears(initialExpanded);
        }

        return groups;
    }, [schedules, assignment?.frequency, expandedYears]);

    // Check if client has filing credentials
    const hasCredentials = useMemo(() => {
        if (!assignment) return false;
        const credentials = assignment.custom_fields || {};
        let schema = getRequiredFieldsForService(assignment);
        return schema.length > 0 || Object.keys(credentials).length > 0;
    }, [assignment]);

    // Toggle year accordion
    const toggleYearExpand = (year) => {
        setExpandedYears(prev => ({
            ...prev,
            [year]: !prev[year]
        }));
    };

    // Open status modal
    const openStatusModal = (period) => {
        setSelectedPeriod(period);
        setStatusForm({
            status: period.status,
            amount: String(period.amount)
        });
        setShowStatusModal(true);
    };

    // Handle Status Form Submit
    const handleStatusSubmit = async (e) => {
        e.preventDefault();
        const assignedStaffs = getAssignedStaffList(assignment);
        const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());

        if (!isAdmin && !isBranchOwner && currentUsername && assignedStaffUsernames.length > 0 && !assignedStaffUsernames.includes(currentUsername)) {
            const allowedNames = assignedStaffs.map(emp => emp.name || emp.username).join(', ');
            toast.error(`Only the assigned staff members (${allowedNames}) are permitted to update the payment status.`);
            return;
        }

        const hasFeesPerm = check('recurring_task_fees_view');
        const statusAmountToValidate = hasFeesPerm ? statusForm.amount : '0';
        if (!statusAmountToValidate || isNaN(parseFloat(statusAmountToValidate))) {
            toast.error('Please enter a valid amount');
            return;
        }

        setSubmittingStatus(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/recurring-task/update-period-status`, {
                schedule_id: selectedPeriod.schedule_id,
                status: statusForm.status,
                amount: hasFeesPerm ? parseFloat(statusForm.amount) : (selectedPeriod.amount || 0)
            }, {
                headers: getHeaders()
            });

            if (res.data?.success) {
                toast.success('Period status updated successfully');
                setShowStatusModal(false);
                setSelectedPeriod(null);
                await fetchSchedules(assignment_id);
            }
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally {
            setSubmittingStatus(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Breadcrumbs & Back */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <span className="cursor-pointer hover:text-indigo-650 transition-colors" onClick={() => navigate('/')}>Dashboard</span>
                            <FiChevronRight className="w-3 h-3 text-slate-350" />
                            <span className="cursor-pointer hover:text-indigo-650 transition-colors" onClick={() => navigate('/staff/recurring-tasks')}>Compliance</span>
                            <FiChevronRight className="w-3 h-3 text-slate-350" />
                            <span className="text-slate-700 font-semibold">Assignment Details</span>
                        </div>
                        <button
                            onClick={() => navigate('/staff/recurring-tasks')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-605 hover:text-indigo-650 bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                            <FiArrowLeft className="w-3.5 h-3.5" />
                            Back to Compliance
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <span className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></span>
                            <p className="text-xs font-medium">Loading details...</p>
                        </div>
                    ) : !assignment ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                            <FiAlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm font-semibold">Details Not Found</p>
                            <p className="text-xs mt-1">Make sure you have requested a valid assignment ID.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Header Panel */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                <FiLayers className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <h1 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                                                    {assignment.service_name}
                                                </h1>
                                                <p className="text-xs text-slate-450 font-medium mt-0.5">
                                                    Firm: <span className="text-slate-700 font-bold">{assignment.firm_name}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2.5 items-center">
                                        <div className="text-left md:text-right">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Frequency</span>
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider mt-0.5 ${FREQ_BADGES[String(assignment.frequency).toLowerCase()] || 'bg-slate-50'}`}>
                                                {assignment.frequency}
                                            </span>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200 hidden md:block mx-1" />
                                        <div className="text-left md:text-right">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Staff</span>
                                            {(() => {
                                                const staffList = getAssignedStaffList(assignment);
                                                if (staffList.length === 0) return <span className="text-xs text-slate-400 font-medium">—</span>;
                                                return (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {staffList.map((staff, idx) => (
                                                            <button
                                                                key={staff.username || idx}
                                                                onClick={() => setSelectedStaffDetails(staff)}
                                                                className="text-[10px] bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 font-bold rounded-md px-2 py-0.5 transition-colors shadow-3xs cursor-pointer"
                                                            >
                                                                {staff.name || staff.username}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        {hasCredentials && (
                                            <>
                                                <div className="h-8 w-px bg-slate-200 hidden md:block mx-1" />
                                                <div className="text-left md:text-right">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Credentials</span>
                                                    <button
                                                        onClick={() => setShowCredentialsModal(true)}
                                                        className="text-[10px] bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-transparent text-indigo-700 hover:text-white font-bold rounded-md px-2.5 py-1.5 transition-all shadow-3xs cursor-pointer flex items-center gap-1"
                                                    >
                                                        <FiLock className="w-3.5 h-3.5" />
                                                        Filing Access
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid: Year-wise Schedules */}
                            <div className="w-full space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Compliance Schedules
                                    </h3>
                                    <button
                                        onClick={() => fetchSchedules(assignment_id)}
                                        className="p-1.5 hover:bg-slate-100 border border-slate-200 bg-white rounded-lg text-slate-500 hover:text-indigo-655 transition-colors shadow-3xs cursor-pointer"
                                        title="Reload schedules"
                                    >
                                        <FiRefreshCw className={`w-3.5 h-3.5 ${schedulesLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {schedulesLoading && schedules.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-250 p-12 text-center text-slate-400">
                                        <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2 block"></span>
                                        <p className="text-xs">Loading compliance schedules...</p>
                                    </div>
                                ) : Object.keys(groupedSchedules).length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                                        <FiCalendar className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                                        <p className="text-xs font-semibold">No schedules generated yet</p>
                                    </div>
                                ) : (
                                    Object.keys(groupedSchedules).map(year => {
                                        const yearPeriods = groupedSchedules[year];
                                        const totalPeriods = yearPeriods.length;
                                        const completePeriods = yearPeriods.filter(p => p.status === 'Complete' || p.status === 'Sale').length;
                                        const isExpanded = expandedYears[year];

                                        return (
                                            <div key={year} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all duration-200">
                                                {/* Accordion Trigger */}
                                                <div
                                                    onClick={() => toggleYearExpand(year)}
                                                    className="px-5 py-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-50 border-b border-slate-100 cursor-pointer select-none"
                                                >
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h4 className="text-sm font-bold text-slate-800">
                                                            Financial Year: {year}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-150">
                                                                Complete: {completePeriods} / {totalPeriods}
                                                            </span>
                                                            {totalPeriods - completePeriods > 0 && (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-amber-50 text-amber-700 border-amber-150 animate-pulse">
                                                                    Pending: {totalPeriods - completePeriods}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                                                        {isExpanded ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
                                                    </span>
                                                </div>

                                                {/* Expanded table */}
                                                {isExpanded && (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse min-w-[600px]">
                                                            <thead>
                                                                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 uppercase text-[9px] font-bold tracking-wider">
                                                                    <th className="px-5 py-3">Period Name</th>
                                                                    <th className="px-5 py-3">Amount/Fees</th>
                                                                    <th className="px-5 py-3">Status</th>
                                                                    <th className="px-5 py-3">Due Date & Status</th>
                                                                    <th className="px-5 py-3 text-right w-32">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                                {yearPeriods.map(period => {
                                                                    const staffList = getAssignedStaffList(assignment);
                                                                    const staffUsernames = staffList.map(emp => (emp.username || '').toLowerCase().trim());
                                                                    const isUpdatePermitted = isAdmin || isBranchOwner || !currentUsername || staffList.length === 0 || staffUsernames.includes(currentUsername);
                                                                    const isComplete = period.status === 'Complete' || period.status === 'Sale';
                                                                    const dueInfo = getPeriodDueDateStatus(period, assignment);

                                                                    const tooltipText = isComplete
                                                                        ? `Completed — record locked`
                                                                        : !isPeriodDueDateActive(period, assignment)
                                                                            ? `Only the currently running due date (${getPeriodDueDate(period, assignment)}) can be updated`
                                                                            : isUpdatePermitted
                                                                                ? undefined
                                                                                : `Restricted (Only assigned staff: ${staffList.map(e => e.name || e.username).join(', ')})`;

                                                                    return (
                                                                        <tr
                                                                            key={period.schedule_id}
                                                                            onClick={() => isUpdatePermitted && !isComplete && isPeriodDueDateActive(period, assignment) && openStatusModal(period)}
                                                                            className={`transition-colors hover:bg-slate-50/40 ${isUpdatePermitted && !isComplete && isPeriodDueDateActive(period, assignment)
                                                                                ? "cursor-pointer"
                                                                                : "cursor-default"
                                                                                }`}
                                                                            title={tooltipText}
                                                                        >
                                                                            <td className={`px-5 py-3 text-xs font-semibold ${isUpdatePermitted ? 'text-slate-800' : 'text-slate-400'}`}>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span>{period.period_name}</span>
                                                                                    {tooltipText && (
                                                                                        <FiInfo className={`w-3.5 h-3.5 shrink-0 ${isUpdatePermitted ? 'text-slate-400' : 'text-slate-300'}`} />
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                            <td className={`px-5 py-3 text-xs font-bold ${isUpdatePermitted ? 'text-slate-800' : 'text-slate-400'}`}>
                                                                                {check('recurring_task_fees_view') ? `₹${formatCurrency(period.amount)}` : <span className="blur-[3px] select-none">₹9,999.00</span>}
                                                                            </td>
                                                                            <td className="px-5 py-3 text-xs">
                                                                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${isUpdatePermitted
                                                                                    ? (STATUS_BADGES[period.status] || 'bg-slate-50')
                                                                                    : 'bg-slate-100/70 border-slate-200/50 text-slate-400'
                                                                                    }`}>
                                                                                    {period.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-5 py-3 text-xs">
                                                                                <div className={`font-semibold ${dueInfo.color}`}>
                                                                                    {dueInfo.text}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-5 py-3 text-xs text-right" onClick={(e) => e.stopPropagation()}>
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    {isComplete ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => { e.stopPropagation(); setShareModal({ open: true, period, assign: assignment }); setSharePhone(''); setShareEmail(''); }}
                                                                                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-3xs cursor-pointer"
                                                                                        >
                                                                                            <FiShare2 className="w-2.5 h-2.5" />
                                                                                            Share
                                                                                        </button>
                                                                                    ) : isUpdatePermitted && !isComplete && isPeriodDueDateActive(period, assignment) ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => { e.stopPropagation(); openStatusModal(period); }}
                                                                                            className="inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                                                                                        >
                                                                                            Update
                                                                                        </button>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400 font-medium italic">
                                                                                            Locked
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>


                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Update Status */}
            <AnimatePresence>
                {showStatusModal && selectedPeriod && (() => {
                    const assignedStaffs = getAssignedStaffList(assignment);
                    const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());
                    const isUpdatePermitted = isAdmin || isBranchOwner || !currentUsername || assignedStaffUsernames.length === 0 || assignedStaffUsernames.includes(currentUsername);

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
                                className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-sm my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-slate-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
                                    <div className="flex items-center gap-2">
                                        <FiCalendar className="w-5 h-5" />
                                        <h3 className="text-sm font-bold">Update Period Status</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowStatusModal(false)}
                                        className="p-1 hover:bg-white/10 rounded-lg text-white"
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
                                                            {emp.name || emp.username}
                                                        </span>
                                                        {idx < assignedStaffs.length - 1 ? <span className="text-slate-300">,</span> : ''}
                                                    </span>
                                                ))}
                                            </p>
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
                                                    Restricted: Only the assigned staff member ({assignedStaffs.map(emp => emp.name || emp.username).join(', ')}) can update the status of this period.
                                                </p>
                                            </div>
                                        )}

                                        {/* Select Status */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Status *</label>
                                            <select
                                                value={statusForm.status}
                                                disabled={!isUpdatePermitted}
                                                onChange={(e) => setStatusForm(prev => ({ ...prev, status: e.target.value }))}
                                                className="w-full px-3 py-2.5 text-xs text-slate-750 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
                                            >
                                                <option value="Pending From The Department">Pending (Dept)</option>
                                                <option value="Pending From Client">Pending (Client)</option>
                                                <option value="Complete">Complete</option>
                                                <option value="Cancel">Cancel</option>
                                                <option value="N/A">N/A</option>
                                            </select>
                                        </div>

                                        {/* Amount Field */}
                                        {check('recurring_task_fees_view') && (
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
                                        )}

                                        {statusForm.status === 'Complete' && (
                                            <div className="flex gap-2.5 bg-emerald-50 border border-emerald-150 rounded-xl p-3 text-emerald-800">
                                                <FiCheckCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-600" />
                                                <p className="text-[10.5px] leading-relaxed font-medium">
                                                    Marking as <strong>Complete</strong> will automatically generate a sales invoice and post it to this client firm's ledger. This action <strong>locks</strong> the record.
                                                </p>
                                            </div>
                                        )}
                                        {selectedPeriod.status === 'Complete' && statusForm.status !== 'Complete' && (
                                            <div className="flex gap-2.5 bg-amber-50 border border-amber-150 rounded-xl p-3 text-amber-800">
                                                <FiAlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600" />
                                                <p className="text-[10.5px] leading-relaxed font-medium">
                                                    Changing status away from <strong>Complete</strong> will automatically delete and reverse the posted ledger entry for this period.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowStatusModal(false)}
                                            className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-250 rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submittingStatus || (!check('recurring_task_fees_view') ? false : !statusForm.amount) || !isUpdatePermitted}
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
                                    className="p-1 hover:bg-white/10 rounded-lg text-white"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 flex flex-col items-center flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                <div className="w-16 h-16 bg-indigo-100 text-indigo-750 rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-inner border border-indigo-200 shrink-0">
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
                                        <span className="font-bold text-slate-800 break-all">{selectedStaffDetails.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Share Invoice */}
            <AnimatePresence>
                {shareModal.open && shareModal.period && (
                    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 pointer-events-none">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto" onClick={() => setShareModal({ open: false, period: null, assign: null })} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                                <div className="flex items-center gap-2">
                                    <FiShare2 className="w-5 h-5" />
                                    <h3 className="text-sm font-bold">Share Invoice</h3>
                                </div>
                                <button onClick={() => setShareModal({ open: false, period: null, assign: null })} className="p-1 hover:bg-white/10 rounded-lg">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800">
                                    <p className="font-bold">{shareModal.assign?.firm_name}</p>
                                    <p className="text-[11px] text-emerald-600 mt-0.5">{shareModal.period?.period_name} — {shareModal.assign?.service_name}</p>
                                    <p className="text-[11px] text-emerald-600">Amount: {check('recurring_task_fees_view') ? `₹${formatCurrency(shareModal.period?.amount)}` : '₹••••'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number</label>
                                    <div className="relative">
                                        <FaWhatsapp className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 w-4 h-4" />
                                        <input
                                            type="tel"
                                            value={sharePhone}
                                            onChange={(e) => setSharePhone(e.target.value)}
                                            placeholder="+91 9876543210"
                                            className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                                        <input
                                            type="email"
                                            value={shareEmail}
                                            onChange={(e) => setShareEmail(e.target.value)}
                                            placeholder="client@example.com"
                                            className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShareModal({ open: false, period: null, assign: null })}
                                    className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-250 rounded-xl hover:bg-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!sharePhone && !shareEmail) { toast.error('Enter at least one contact'); return; }
                                        const amountDisplay = check('recurring_task_fees_view') ? `₹${formatCurrency(shareModal.period?.amount)}` : '••••';
                                        const msg = `Hi, your invoice for ${shareModal.assign?.service_name} (${shareModal.period?.period_name}) is ${amountDisplay}. Status: Complete.`;
                                        if (sharePhone) window.open(`https://wa.me/${sharePhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                        if (shareEmail) window.open(`mailto:${shareEmail}?subject=Invoice - ${shareModal.assign?.service_name}&body=${encodeURIComponent(msg)}`);
                                        setShareModal({ open: false, period: null, assign: null });
                                        toast.success('Shared successfully!');
                                    }}
                                    className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <FiShare2 className="w-3.5 h-3.5" />
                                    Send
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Filing Credentials */}
            <AnimatePresence>
                {showCredentialsModal && assignment && (() => {
                    const credentials = assignment.custom_fields || {};
                    let schema = getRequiredFieldsForService(assignment);
                    if (schema.length === 0 && Object.keys(credentials).length > 0) {
                        schema = Object.keys(credentials).map(key => {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            const type = (key.toLowerCase().includes('pass') || key.toLowerCase().includes('secret')) ? 'password' : 'text';
                            return { key, label, type };
                        });
                    }

                    return (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                            <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
                                onClick={() => setShowCredentialsModal(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-800 to-indigo-950 text-white shrink-0">
                                    <div className="flex items-center gap-2">
                                        <FiLock className="w-5 h-5 text-indigo-400" />
                                        <h3 className="text-sm font-bold">Filing Credentials</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowCredentialsModal(false)}
                                        className="p-1 hover:bg-white/10 rounded-lg text-white"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-5 flex flex-col gap-2.5">
                                    <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3 mb-1 text-[11px] font-medium text-slate-600 leading-relaxed">
                                        <p>Filing credentials for <strong>{assignment.firm_name}</strong> to access portals for <strong>{assignment.service_name}</strong>.</p>
                                    </div>
                                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl px-4 py-2 bg-slate-50/30">
                                        {schema.map(field => {
                                            const val = credentials[field.key];
                                            return (
                                                <CredentialRow
                                                    key={field.key}
                                                    label={field.label}
                                                    val={val}
                                                    type={field.type}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowCredentialsModal(false)}
                                        className="w-full py-2 text-xs font-semibold text-slate-600 border border-slate-250 rounded-xl hover:bg-white transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};

export default ComplianceAssignmentDetails;
