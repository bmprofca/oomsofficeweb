import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    FiSearch, FiPlus, FiRefreshCw, FiCheckCircle, FiAlertCircle,
    FiLayers, FiChevronRight, FiChevronDown, FiDollarSign, FiCheck,
    FiX, FiEye, FiInfo, FiBookOpen, FiBriefcase, FiCalendar, FiArrowRight,
    FiUser, FiEdit2, FiTrash2, FiShare2, FiChevronLeft, FiMenu
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';
import { MdEmail } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import getHeaders from '../../utils/get-headers';
import API_BASE_URL from '../../utils/api-controller';
import AssignedStaffList from '../../components/Modals/AssignedStaffList';

/* ─── Helpers ────────────────────────────────────────────────────── */
const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const STATUS_BADGES = {
    'Pending From The Department': 'bg-amber-100 text-amber-800 border-amber-200',
    'Pending From Client': 'bg-orange-100 text-orange-800 border-orange-200',
    'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'Complete': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Sale': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'N/A': 'bg-slate-100 text-slate-500 border-slate-200',
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

const getPeriodDueDate = (period) => {
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

    if (isQ1(pName)) return `31 Jul ${startYear}`;
    if (isQ2(pName)) return `31 Oct ${startYear}`;
    if (isQ3(pName)) return `31 Jan ${endYear}`;
    if (isQ4(pName)) return `30 Apr ${endYear}`;

    if (pName === 'Yearly' || pName === 'Year' || pName?.toLowerCase().includes('yearly')) return `31 Dec ${endYear}`;

    return '—';
};

const getUpcomingDueDateInfo = (assign, allSchedules) => {
    const assignSchedules = allSchedules.filter(s => s.assignment_id === assign.assignment_id);
    if (assignSchedules.length === 0) return { text: '—', color: 'text-slate-400' };

    const MONTH_ORDER = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

    const sorted = [...assignSchedules].sort((a, b) => {
        const freq = assign.frequency?.toLowerCase();
        if (freq === 'monthly') {
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

    const pending = sorted.find(s => s.status !== 'Complete' && s.status !== 'Sale' && s.status !== 'N/A');
    if (pending) {
        const dateStr = getPeriodDueDate(pending);
        return {
            text: `${dateStr} (${pending.period_name})`,
            color: 'text-amber-600 font-semibold',
            allDates: sorted.map(s => `${s.period_name}: ${getPeriodDueDate(s)} (${s.status})`).join('\n')
        };
    }

    return {
        text: 'All Completed',
        color: 'text-emerald-600 font-semibold',
        allDates: sorted.map(s => `${s.period_name}: ${getPeriodDueDate(s)} (${s.status})`).join('\n')
    };
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

const isStatusMatch = (scheduleStatus, filterValue) => {
    if (!filterValue) return true;
    const s = String(scheduleStatus || '').toLowerCase();
    const f = String(filterValue).toLowerCase();
    if (f === 'pending') {
        return s.includes('pending') || s === 'pfc';
    }
    if (f === 'complete' || f === 'sale') {
        return s === 'complete' || s === 'sale';
    }
    return s === f;
};

const isPeriodDueDateActive = (period) => {
    if (!period) return false;
    let dueDateObj = null;
    if (period.due_date) {
        dueDateObj = new Date(period.due_date);
    } else {
        const dateStr = getPeriodDueDate(period);
        if (dateStr && dateStr !== '—') {
            dueDateObj = new Date(dateStr);
        }
    }
    if (!dueDateObj || isNaN(dueDateObj.getTime())) return false;
    const today = new Date();
    return dueDateObj.getMonth() === today.getMonth() && dueDateObj.getFullYear() === today.getFullYear();
};

const getVisible6Months = (financialYear) => {
    const today = new Date();
    const months = [];
    const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(MONTH_NAMES_SHORT[d.getMonth()]);
    }
    return months;
};


const getPeriodHeadersForFreq = (frequency, financialYear) => {
    const freq = frequency?.toLowerCase();
    if (freq === 'monthly') {
        return getVisible6Months(financialYear);
    }
    return getPeriodHeaders(frequency);
};

const getPeriodSchedule = (assignmentSchedules, headerText, frequency) => {
    const freq = frequency?.toLowerCase();
    if (freq === 'monthly') {
        const fullMonthName = MONTH_MAP[headerText];
        return assignmentSchedules.find(p => p.period_name?.toLowerCase() === fullMonthName?.toLowerCase());
    }
    if (freq === 'quarterly') {
        if (headerText === 'APR-JUN') {
            return assignmentSchedules.find(p => isQ1(p.period_name));
        }
        if (headerText === 'JUL-SEP') {
            return assignmentSchedules.find(p => isQ2(p.period_name));
        }
        if (headerText === 'OCT-DEC') {
            return assignmentSchedules.find(p => isQ3(p.period_name));
        }
        if (headerText === 'JAN-MAR') {
            return assignmentSchedules.find(p => isQ4(p.period_name));
        }
    }
    if (freq === 'halfyearly') {
        if (headerText === 'APR-SEP') {
            return assignmentSchedules.find(p => isH1(p.period_name));
        }
        if (headerText === 'OCT-MAR') {
            return assignmentSchedules.find(p => isH2(p.period_name));
        }
    }
    if (freq === 'yearly') {
        return assignmentSchedules[0];
    }
    return null;
};

const ComplianceServices = () => {
    const currentUsername = (localStorage.getItem('user_username') || '').toLowerCase().trim();
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

    // Tab control: 'assignments' only now
    const [activeTab, setActiveTab] = useState('assignments');

    // Predefined Services list states (still fetched for the assign form dropdown)
    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [serviceSearch, setServiceSearch] = useState('');

    // Active dropdown, broadcast, and calendar modal states
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [broadcastModal, setBroadcastModal] = useState({ open: false, assign: null });
    const [broadcastPhone, setBroadcastPhone] = useState('');
    const [broadcastEmail, setBroadcastEmail] = useState('');
    const [showFullCalendarModal, setShowFullCalendarModal] = useState(false);
    const [fullCalendarAssignment, setFullCalendarAssignment] = useState(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.dropdown-container')) {
                setActiveDropdownId(null);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    // Edit / Delete assignment state
    const [editAssignment, setEditAssignment] = useState(null); // assignment object being edited
    const [showEditModal, setShowEditModal] = useState(false);
    const [deletingAssignmentId, setDeletingAssignmentId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [submittingEdit, setSubmittingEdit] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        custom_amount: '',
        employee_usernames: [],
        ca_id: '',
        pay_from_month: '',
        quarters: [],
        status: 'active'
    });

    // Edit modal - CA search states
    const [editCaSearchQuery, setEditCaSearchQuery] = useState('');
    const [editCaSearchResults, setEditCaSearchResults] = useState([]);
    const [editCaSearchLoading, setEditCaSearchLoading] = useState(false);
    const [editSelectedCa, setEditSelectedCa] = useState(null);
    const [showEditCaDropdown, setShowEditCaDropdown] = useState(false);
    const editCaAbortRef = useRef(null);

    // Edit modal - staff search state
    const [editStaffSearchQuery, setEditStaffSearchQuery] = useState('');

    // Share Invoice modal state
    const [shareModal, setShareModal] = useState({ open: false, period: null, assign: null });
    const [sharePhone, setSharePhone] = useState('');
    const [shareEmail, setShareEmail] = useState('');

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

    // Staff and CA states for assigning compliance
    const [staffList, setStaffList] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [allSchedules, setAllSchedules] = useState([]);
    const [selectedFilingStatus, setSelectedFilingStatus] = useState('Pending');

    // Helper to extract assigned staff list
    const getAssignedStaffList = useCallback((assign) => {
        if (!assign) return [];

        let usernames = [];
        if (assign.employees && Array.isArray(assign.employees)) {
            assign.employees.forEach(emp => {
                const u = emp.username || emp.employee_id || '';
                if (String(u).includes(',')) {
                    usernames.push(...String(u).split(',').map(x => x.trim()).filter(Boolean));
                } else if (u) {
                    usernames.push(String(u).trim());
                }
            });
        } else {
            const empUser = assign.employee?.username || assign.employee?.employee_id || '';
            const usernamesStr = assign.employee_username || assign.employee_id || (typeof assign.employee === 'string' ? assign.employee : empUser);
            if (usernamesStr) {
                usernames = String(usernamesStr).split(',').map(u => u.trim()).filter(Boolean);
            } else if (assign.employee) {
                return [assign.employee];
            }
        }

        if (usernames.length > 0) {
            return usernames.map(username => {
                const matched = staffList.find(s => s.username === username);
                return matched || { username, name: username };
            });
        }

        return [];
    }, [staffList]);
    const [caSearchQuery, setCaSearchQuery] = useState('');
    const [caSearchResults, setCaSearchResults] = useState([]);
    const [caSearchLoading, setCaSearchLoading] = useState(false);
    const [selectedCa, setSelectedCa] = useState(null);
    const [showCaDropdown, setShowCaDropdown] = useState(false);
    const caAbortRef = useRef(null);

    // Open edit modal — pre-fill form from assignment object
    const openEditModal = useCallback((assign) => {
        setEditAssignment(assign);

        // Resolve employee_usernames from the assignment
        let empUsernames = [];
        if (assign.employees && Array.isArray(assign.employees)) {
            assign.employees.forEach(emp => {
                const u = emp.username || emp.employee_id || '';
                String(u).split(',').map(x => x.trim()).filter(Boolean).forEach(x => empUsernames.push(x));
            });
        } else {
            const raw = assign.employee_username || assign.employee_id || '';
            empUsernames = String(raw).split(',').map(u => u.trim()).filter(Boolean);
        }

        // Resolve quarters (may come back as e.g. "2,3,4" or [2,3,4])
        let quarters = [];
        if (assign.quarters) {
            if (Array.isArray(assign.quarters)) {
                quarters = assign.quarters.map(Number);
            } else {
                quarters = String(assign.quarters).split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
            }
        }

        setEditForm({
            custom_amount: String(assign.custom_amount || ''),
            employee_usernames: empUsernames,
            ca_id: assign.ca_id || assign.ca?.username || '',
            pay_from_month: assign.pay_from_month || '',
            quarters,
            status: assign.status || 'active'
        });

        // Pre-fill CA if present
        if (assign.ca) {
            setEditSelectedCa(assign.ca);
        } else if (assign.ca_id) {
            setEditSelectedCa({ username: assign.ca_id, name: assign.ca_id });
        } else {
            setEditSelectedCa(null);
        }

        setEditCaSearchQuery('');
        setEditCaSearchResults([]);
        setEditStaffSearchQuery('');
        setShowEditModal(true);
    }, []);

    const filteredStaffResults = useMemo(() => {
        const query = staffSearchQuery.trim().toLowerCase();
        if (!query) return [];
        return staffList.filter(s =>
            (s.name || '').toLowerCase().includes(query) ||
            (s.username || '').toLowerCase().includes(query)
        );
    }, [staffList, staffSearchQuery]);

    // Searchable Firm Dropdown states
    const [firmSearchQuery, setFirmSearchQuery] = useState('');
    const [firmSearchResults, setFirmSearchResults] = useState([]);
    const [firmSearchLoading, setFirmSearchLoading] = useState(false);
    const [selectedFirm, setSelectedFirm] = useState(null);
    const [selectedFirmsData, setSelectedFirmsData] = useState([]);
    const [showFirmDropdown, setShowFirmDropdown] = useState(false);
    const [selectedFY, setSelectedFY] = useState('2026-2027');
    const [selectedServiceFilter, setSelectedServiceFilter] = useState('');
    const selectedServiceObj = services.find(s => String(s.service_id) === String(selectedServiceFilter) || String(s.name) === String(selectedServiceFilter));
    const activeFrequency = selectedServiceObj ? selectedServiceObj.frequency?.toLowerCase() : 'monthly';
    const isServiceFiltered = selectedServiceFilter !== '';
    const periodHeaders = isServiceFiltered ? getPeriodHeadersForFreq(activeFrequency, selectedFY) : [];

    const renderCell = (period, assign) => {
        if (!period) return <td key={Math.random()} className="px-2 py-3 text-center text-slate-350 font-mono">—</td>;

        let statusLetter = 'P';
        let cellClass = 'bg-amber-50 text-amber-700 border-amber-200';
        const st = period.status;
        if (st === 'Complete' || st === 'Sale') {
            statusLetter = 'C';
            cellClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (st === 'Pending From Client' || st === 'PFC') {
            statusLetter = 'PC';
            cellClass = 'bg-orange-50 text-orange-700 border-orange-200';
        } else if (st === 'Outsource') {
            statusLetter = 'O';
            cellClass = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (st === 'N/A') {
            statusLetter = 'N';
            cellClass = 'bg-slate-50 text-slate-400 border-slate-200';
        } else if (st === 'Pending From The Department' || st === 'Pending') {
            statusLetter = 'P';
            cellClass = 'bg-amber-50 text-amber-700 border-amber-200';
        }

        const dueDateText = getPeriodDueDate(period);
        const showDirectDueDate = selectedFilingStatus === '';

        const assignedStaffs = getAssignedStaffList(assign);
        const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());
        const isUpdatePermitted = !currentUsername || assignedStaffUsernames.length === 0 || assignedStaffUsernames.includes(currentUsername);
        const isComplete = st === 'Complete' || st === 'Sale';

        return (
            <td key={period.schedule_id} className="px-2 py-2 text-center align-middle">
                <div className="flex flex-col items-center gap-0.5">
                    <div
                        onClick={() => isUpdatePermitted && !isComplete && isPeriodDueDateActive(period) && openStatusModal(period, assign)}
                        className={`inline-flex items-center justify-center gap-1 min-w-[32px] h-[26px] rounded border text-[10px] font-bold select-none ${isUpdatePermitted && !isComplete && isPeriodDueDateActive(period)
                            ? `cursor-pointer transition-all hover:scale-105 ${cellClass}`
                            : isComplete
                                ? `${cellClass} cursor-default`
                                : "bg-slate-50 text-slate-350 border-slate-100 cursor-not-allowed opacity-50"
                            }`}
                        title={
                            isComplete
                                ? `Completed — locked`
                                : !isPeriodDueDateActive(period)
                                    ? `Only the currently running due date (${dueDateText}) can be updated`
                                    : isUpdatePermitted
                                        ? (showDirectDueDate ? `Due Date: ${dueDateText}` : `Status: ${period.status}`)
                                        : `Restricted (Only assigned staff: ${assignedStaffs.map(e => e.name || e.username).join(', ')})`
                        }
                    >
                        <span className="px-1.5 h-full flex items-center justify-center flex-grow text-center">
                            {statusLetter}
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold leading-none mt-1 block select-none">{dueDateText.split(' ').slice(0, 2).join(' ')}</span>
                </div>
            </td>
        );
    };
    const firmAbortRef = useRef(null);

    // Firm groups states
    const [groupsList, setGroupsList] = useState([]);
    const [groupsLoading, setGroupsLoading] = useState(false);

    const fetchGroups = useCallback(async () => {
        setGroupsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/group/list`, {
                headers: getHeaders()
            });
            if (res.data?.success) {
                setGroupsList(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching groups list:', err);
        } finally {
            setGroupsLoading(false);
        }
    }, []);

    // Filter assignments inline
    const filteredAssignments = assignments.filter(assign => {
        const fyMatch = selectedFY === '' || (() => {
            const normalizeFY = (fy) => {
                if (!fy) return '';
                let clean = fy.toLowerCase().replace(/fy/g, '').trim().replace(/\s+/g, '');
                const parts = clean.split('-');
                if (parts.length !== 2) return fy;
                let start = parts[0].length === 2 ? '20' + parts[0] : parts[0];
                let end = parts[1].length === 2 ? '20' + parts[1] : parts[1];
                return start.length === 4 && end.length === 4 ? `${start}-${end}` : fy;
            };
            return normalizeFY(assign.financial_year) === normalizeFY(selectedFY);
        })();

        const serviceMatch = selectedServiceFilter === '' ||
            String(assign.service_id) === String(selectedServiceFilter) ||
            String(assign.service_name) === String(selectedServiceFilter);

        const statusMatch = selectedFilingStatus === '' || (() => {
            const assignSchedules = allSchedules.filter(s => s.assignment_id === assign.assignment_id);
            return assignSchedules.some(s => isStatusMatch(s.status, selectedFilingStatus));
        })();

        return fyMatch && serviceMatch && statusMatch;
    });

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
            const res = await axios.get(`${API_BASE_URL}/recurring-task/services`, {
                headers: getHeaders(),
                params: { search }
            });
            if (res.data?.success) {
                const activeList = (res.data.data || []).filter(s => s.status === 'Active');
                setServices(activeList);
                // Update active services count
                setStats(prev => ({ ...prev, activeServices: activeList.length }));
            }
        } catch (err) {
            console.error('Error fetching recurring task templates:', err);
            toast.error('Failed to load recurring task templates');
        } finally {
            setServicesLoading(false);
        }
    }, []);

    // Fetch Assignments
    const fetchAssignments = useCallback(async (search = '') => {
        setAssignmentsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/recurring-task/assignments`, {
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
            const res = await axios.get(`${API_BASE_URL}/recurring-task/schedule`, {
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

    // Fetch Staff List for assigning
    const fetchStaff = useCallback(async () => {
        setStaffLoading(true);
        const base = API_BASE_URL.replace(/\/$/, '');
        let page = 1;
        const limit = 100;
        const all = [];
        try {
            for (; ;) {
                const res = await axios.get(`${base}/settings/staff/list`, {
                    headers: getHeaders(),
                    params: { search: '', page, limit }
                });
                const list = res.data?.data || [];
                all.push(...list);
                if (res.data?.meta?.is_last_page || list.length < limit) break;
                page += 1;
            }
            setStaffList(all.map(item => ({
                username: item.username,
                name: item.profile?.name ?? item.username,
                email: item.profile?.email ?? item.email ?? '—',
                mobile: item.profile?.mobile ?? item.profile?.phone ?? item.phone ?? '—'
            })));
        } catch (err) {
            console.error('Failed to fetch staff list:', err);
        } finally {
            setStaffLoading(false);
        }
    }, []);

    // Load initial data
    useEffect(() => {
        fetchServices();
        fetchAssignments();
        fetchStaff();
        fetchGroups();

        // Fetch all schedules to compute total sales amount and pending counts
        const fetchAllStats = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/recurring-task/schedule`, {
                    headers: getHeaders()
                });
                if (res.data?.success) {
                    const allSchedulesData = res.data.data || [];
                    setAllSchedules(allSchedulesData);
                    const salesAmount = allSchedulesData
                        .filter(s => s.status === 'Sale')
                        .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                    const pendingCount = allSchedulesData.filter(s => s.status === 'Pending').length;

                    setStats(prev => ({
                        ...prev,
                        totalSalesAmount: salesAmount,
                        pendingActions: pendingCount
                    }));
                }
            } catch (err) {
                console.error('Error calculating recurring task schedules stats:', err);
            }
        };
        fetchAllStats();
    }, [fetchServices, fetchAssignments, fetchStaff, fetchGroups]);

    // Handle CA search autocomplete (Assign modal)
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

    // Handle CA search autocomplete (Edit modal)
    useEffect(() => {
        const term = editCaSearchQuery.trim();
        if (term.length < 3) {
            setEditCaSearchResults([]);
            return;
        }

        const t = setTimeout(async () => {
            setEditCaSearchLoading(true);
            editCaAbortRef.current?.abort();
            const ctrl = new AbortController();
            editCaAbortRef.current = ctrl;

            try {
                const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/ca/search?search=${encodeURIComponent(term)}`, {
                    headers: getHeaders(),
                    signal: ctrl.signal
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    setEditCaSearchResults(data.data);
                } else {
                    setEditCaSearchResults([]);
                }
            } catch (e) {
                if (e?.name !== 'AbortError') setEditCaSearchResults([]);
            } finally {
                setEditCaSearchLoading(false);
            }
        }, 350);

        return () => {
            clearTimeout(t);
            editCaAbortRef.current?.abort();
        };
    }, [editCaSearchQuery]);

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
    const openStatusModal = (period, assign = null) => {
        setSelectedPeriod(period);
        setSelectedPeriodAssign(assign);
        setStatusForm({
            status: period.status,
            amount: String(period.amount)
        });
        setShowStatusModal(true);
    };

    const handleOpenBroadcast = (assign) => {
        setBroadcastModal({ open: true, assign });
        setBroadcastPhone(assign.client_mobile || assign.client_phone || assign.mobile || assign.phone || '');
        setBroadcastEmail(assign.client_email || assign.email || '');
    };

    const handleOpenFullCalendar = (assign) => {
        setFullCalendarAssignment(assign);
        fetchSchedules(assign.assignment_id);
        setShowFullCalendarModal(true);
    };

    // Submit Assign Form
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
        if (!assignForm.service_id || !assignForm.custom_amount || (!assignForm.employee_usernames || assignForm.employee_usernames.length === 0)) {
            toast.error('Please fill in all required fields (Service, Custom Fees, and Assigned Staff)');
            return;
        }

        setSubmittingAssign(true);
        try {
            const selectedService = services.find(s => s.service_id === assignForm.service_id);
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
            } else if (isGroup) {
                payload.groups = assignForm.groups;
            }

            if (assignForm.ca_id) {
                payload.ca_id = assignForm.ca_id;
            }
            const isGstr1 = assignForm.service_id === 'GSTR-1' || (selectedService?.name && /gstr-1/i.test(selectedService.name));
            const effectiveFreq = isGstr1 ? 'monthly' : selectedService?.frequency?.toLowerCase();

            if (effectiveFreq === 'monthly' && assignForm.pay_from_month) {
                payload.pay_from_month = assignForm.pay_from_month;
            }
            if (effectiveFreq === 'quarterly' && assignForm.quarters?.length > 0) {
                payload.quarters = assignForm.quarters;
            }

            const res = await axios.post(`${API_BASE_URL}/recurring-task/assign`, payload, {
                headers: getHeaders()
            });

            if (res.data?.success) {
                toast.success('Recurring task assigned successfully');
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
                setSelectedFirm(null);
                setSelectedFirmsData([]);
                setSelectedCa(null);
                setCaSearchQuery('');
                fetchAssignments();
            }
        } catch (err) {
            console.error('Error assigning service:', err);
            toast.error(err.response?.data?.message || 'Failed to assign recurring task');
        } finally {
            setSubmittingAssign(false);
        }
    };

    // Submit Edit Assignment Form
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editAssignment) return;

        if (!editForm.custom_amount || isNaN(parseFloat(editForm.custom_amount))) {
            toast.error('Please enter a valid custom fees amount');
            return;
        }
        if (!editForm.employee_usernames || editForm.employee_usernames.length === 0) {
            toast.error('Please select at least one assigned staff member');
            return;
        }

        setSubmittingEdit(true);
        try {
            const payload = {
                custom_amount: parseFloat(editForm.custom_amount),
                employee_username: editForm.employee_usernames.join(','),
                status: editForm.status
            };
            if (editForm.ca_id) payload.ca_id = editForm.ca_id;
            if (editForm.pay_from_month) payload.pay_from_month = editForm.pay_from_month;
            if (editForm.quarters && editForm.quarters.length > 0) {
                payload.quarters = editForm.quarters.join(',');
            }

            await axios.put(
                `${API_BASE_URL}/recurring-task/assignments/${editAssignment.assignment_id}`,
                payload,
                { headers: getHeaders() }
            );

            toast.success('Assignment updated successfully');
            setShowEditModal(false);
            setEditAssignment(null);
            fetchAssignments();
        } catch (err) {
            console.error('Error updating assignment:', err);
            toast.error(err.response?.data?.message || 'Failed to update assignment');
        } finally {
            setSubmittingEdit(false);
        }
    };

    // Submit Status Update Form
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
            const res = await axios.post(`${API_BASE_URL}/recurring-task/update-period-status`, {
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
                const statsRes = await axios.get(`${API_BASE_URL}/recurring-task/schedule`, { headers: getHeaders() });
                if (statsRes.data?.success) {
                    const allSchedulesData = statsRes.data.data || [];
                    setAllSchedules(allSchedulesData);
                    const salesAmount = allSchedulesData
                        .filter(s => s.status === 'Sale')
                        .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                    const pendingCount = allSchedulesData.filter(s => s.status === 'Pending').length;

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
                                <h1 className="text-xl font-bold text-slate-800 leading-tight">Recurring Tasks</h1>
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
                                Assign Recurring Task
                            </motion.button>
                        )}
                    </div>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Assigned Entities', value: stats.totalAssigned, color: 'bg-blue-500', icon: FiBriefcase },
                            { label: 'Recurring Tasks', value: stats.activeServices, color: 'bg-indigo-500', icon: FiLayers },
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

                                {/* Service Selector Dropdown */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <span>Service:</span>
                                    <select
                                        value={selectedServiceFilter}
                                        onChange={(e) => setSelectedServiceFilter(e.target.value)}
                                        className="px-2 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none max-w-[200px]"
                                    >
                                        <option value="">All Services</option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.service_id || s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filing Status Selector Dropdown */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <span>Filing Status:</span>
                                    <select
                                        value={selectedFilingStatus}
                                        onChange={(e) => setSelectedFilingStatus(e.target.value)}
                                        className="px-2 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-medium"
                                    >
                                        <option value="">All Status</option>
                                        <option value="Pending">Pending (All)</option>
                                        <option value="Pending From The Department">Pending (Dept)</option>
                                        <option value="Pending From Client">Pending (Client)</option>
                                        <option value="Complete">Complete</option>
                                        <option value="Outsource">Outsource</option>
                                        <option value="N/A">N/A</option>
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
                                {isServiceFiltered ? (
                                    <div className="min-w-[800px]">
                                        <table className="w-full text-sm text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                                                    <th className="px-4 py-3 text-center w-12">SR</th>
                                                    <th className="px-4 py-3">Firm Name</th>
                                                    <th className="px-4 py-3 text-center">Staffs</th>
                                                    {periodHeaders.map((header) => (
                                                        <th key={header} className="px-2 py-3 text-center uppercase tracking-wider">{header}</th>
                                                    ))}
                                                    <th className="px-4 py-3 text-center w-24">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {assignmentsLoading ? (
                                                    <tr>
                                                        <td colSpan={4 + periodHeaders.length} className="px-4 py-8 text-center">
                                                            <div className="animate-pulse flex flex-col gap-2">
                                                                <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto"></div>
                                                                <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto"></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredAssignments.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4 + periodHeaders.length} className="px-4 py-12 text-center text-slate-400">
                                                            <FiBriefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                            <p className="text-xs font-medium text-slate-500">No recurring task assignments found</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredAssignments.map((assign, idx) => {
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
                                                                {periodHeaders.map((headerText) => {
                                                                    const period = getPeriodSchedule(assignSchedules, headerText, activeFrequency);
                                                                    return renderCell(period, assign);
                                                                })}
                                                                <td className="px-4 py-3 text-center align-middle">
                                                                    <div className={`dropdown-container relative flex justify-center ${activeDropdownId === assign.assignment_id ? 'z-50' : 'z-0'}`}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveDropdownId(activeDropdownId === assign.assignment_id ? null : assign.assignment_id);
                                                                            }}
                                                                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 border border-slate-200 transition-colors"
                                                                        >
                                                                            <FiMenu className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <AnimatePresence>
                                                                            {activeDropdownId === assign.assignment_id && (
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                                                                    className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 z-55 overflow-hidden text-left"
                                                                                >
                                                                                    <div className="py-1">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                openEditModal(assign);
                                                                                                setActiveDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 transition-colors"
                                                                                        >
                                                                                            <FiEdit2 className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                                                                            Edit
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setConfirmDeleteId(assign.assignment_id);
                                                                                                setActiveDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 transition-colors"
                                                                                        >
                                                                                            <FiTrash2 className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                                                                            Delete
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleOpenBroadcast(assign);
                                                                                                setActiveDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 transition-colors"
                                                                                        >
                                                                                            <FiShare2 className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                                                                            Broadcast
                                                                                        </button>
                                                                                        {assign.frequency === 'monthly' && (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleOpenFullCalendar(assign);
                                                                                                    setActiveDropdownId(null);
                                                                                                }}
                                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 transition-colors border-t border-slate-100"
                                                                                            >
                                                                                                <FiEye className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                                                                                Show Full
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                </td>
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
                                                    Pending (Dept)
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded border bg-orange-50 text-orange-700 border-orange-200 flex items-center justify-center text-[10px] font-bold">PC</span>
                                                    Pending (Client)
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center justify-center text-[10px] font-bold">C</span>
                                                    Complete (Locked)
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
                                                * Click badge to update status · Complete periods are locked
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                                                <th className="px-4 py-3 text-center w-12">SR</th>
                                                <th className="px-4 py-3">Firm Name</th>
                                                <th className="px-4 py-3">Recurring Task</th>
                                                <th className="px-4 py-3">Frequency</th>
                                                <th className="px-4 py-3">FY</th>
                                                <th className="px-4 py-3">Due Date</th>
                                                <th className="px-4 py-3">Staffs</th>
                                                <th className="px-4 py-3 w-28">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {assignmentsLoading ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-8 text-center">
                                                        <div className="animate-pulse flex flex-col gap-2">
                                                            <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto"></div>
                                                            <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredAssignments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                                        <FiBriefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-xs font-medium text-slate-500">No recurring tasks found</p>
                                                        <p className="text-[11px] mt-0.5">Click "Assign Recurring Task" above to link a firm</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAssignments.map((assign, idx) => (
                                                    <React.Fragment key={assign.assignment_id}>
                                                        <tr
                                                            onClick={() => handleSelectAssignment(assign.assignment_id)}
                                                            className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${selectedAssignmentId === assign.assignment_id ? 'bg-indigo-50/20' : ''
                                                                }`}
                                                        >
                                                            <td className="px-4 py-3 text-center font-mono text-xs text-slate-400">
                                                                {idx + 1}
                                                            </td>
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
                                                            <td className="px-4 py-3 text-xs">
                                                                {(() => {
                                                                    const info = getUpcomingDueDateInfo(assign, allSchedules);
                                                                    return (
                                                                        <span className={info.color} title={info.allDates || ''}>
                                                                            {info.text}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-655 text-xs">
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
                                                            <td className="px-3 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <div className={`dropdown-container relative flex justify-center ${activeDropdownId === assign.assignment_id ? 'z-50' : 'z-0'}`}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveDropdownId(activeDropdownId === assign.assignment_id ? null : assign.assignment_id);
                                                                            }}
                                                                            className="p-1.5 text-slate-500 hover:text-indigo-650 rounded-lg hover:bg-indigo-50 border border-slate-200 transition-colors"
                                                                        >
                                                                            <FiMenu className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <AnimatePresence>
                                                                            {activeDropdownId === assign.assignment_id && (
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                                                                    className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 z-55 overflow-hidden text-left"
                                                                                >
                                                                                    <div className="py-1">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                openEditModal(assign);
                                                                                                setActiveDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 transition-colors"
                                                                                        >
                                                                                            <FiEdit2 className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                                                                            Edit
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setConfirmDeleteId(assign.assignment_id);
                                                                                                setActiveDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 transition-colors"
                                                                                        >
                                                                                            <FiTrash2 className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                                                                            Delete
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleOpenBroadcast(assign);
                                                                                                setActiveDropdownId(null);
                                                                                            }}
                                                                                            className="flex items-center w-full px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 transition-colors"
                                                                                        >
                                                                                            <FiShare2 className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                                                                            Broadcast
                                                                                        </button>
                                                                                        {assign.frequency === 'monthly' && (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleOpenFullCalendar(assign);
                                                                                                    setActiveDropdownId(null);
                                                                                                }}
                                                                                                className="flex items-center w-full px-3 py-2 text-xs text-slate-705 hover:bg-indigo-50 transition-colors border-t border-slate-100"
                                                                                            >
                                                                                                <FiEye className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                                                                                Show Full
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); handleSelectAssignment(assign.assignment_id); }}
                                                                        className="text-slate-400 hover:text-indigo-650 transition-colors p-1"
                                                                    >
                                                                        {selectedAssignmentId === assign.assignment_id ? (
                                                                            <FiChevronDown className="w-4 h-4" />
                                                                        ) : (
                                                                            <FiChevronRight className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* Expanded Schedule Details */}
                                                        {selectedAssignmentId === assign.assignment_id && (
                                                            <tr>
                                                                <td colSpan={8} className="bg-slate-50/40 p-4 border-t border-b border-indigo-100/50">
                                                                    <div className="mb-3 flex justify-between items-center">
                                                                        <h6 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                                            Schedule Details for {assign.financial_year}
                                                                        </h6>
                                                                        {(() => {
                                                                            const assignedStaffs = getAssignedStaffList(assign);
                                                                            if (assignedStaffs.length === 0) return null;
                                                                            return (
                                                                                <div className="flex flex-wrap gap-1 items-center">
                                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1">Staff:</span>
                                                                                    {assignedStaffs.map((emp, idx) => (
                                                                                        <button
                                                                                            type="button"
                                                                                            key={emp.username || idx}
                                                                                            onClick={() => setSelectedStaffDetails(emp)}
                                                                                            className="text-[10px] text-slate-655 bg-white border border-slate-200 rounded-md px-2 py-0.5 hover:border-indigo-300 hover:text-indigo-650 transition-colors font-medium shadow-2xs cursor-pointer animate-pulse"
                                                                                        >
                                                                                            {emp.name}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>

                                                                    {schedulesLoading ? (
                                                                        <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
                                                                            <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                                                                            Loading periods…
                                                                        </div>
                                                                    ) : (
                                                                        <div>
                                                                            {/* Monthly 6-month window label */}
                                                                            {assign.frequency === 'monthly' && (
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                                                        Showing: {getVisible6Months(assign.financial_year).join(', ')}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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

                                                                                    return filteredSchedules
                                                                                        .filter(p => {
                                                                                            // For monthly frequency, filter to only visible 6 months
                                                                                            if (assign.frequency !== 'monthly') return true;
                                                                                            const MONTH_ABBR = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
                                                                                            const MONTH_FULL = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                                                                                            const abbr = MONTH_FULL.indexOf(p.period_name);
                                                                                            if (abbr === -1) return true;
                                                                                            const visM = getVisible6Months(assign.financial_year);
                                                                                            return visM.includes(MONTH_ABBR[abbr]);
                                                                                        })
                                                                                        .map((period) => {
                                                                                            const assignedStaffs = getAssignedStaffList(assign);
                                                                                            const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());
                                                                                            const isUpdatePermitted = !currentUsername || assignedStaffUsernames.length === 0 || assignedStaffUsernames.includes(currentUsername);
                                                                                            const isComplete = period.status === 'Complete' || period.status === 'Sale';

                                                                                            return (
                                                                                                <div
                                                                                                    key={period.schedule_id}
                                                                                                    onClick={() => isUpdatePermitted && !isComplete && isPeriodDueDateActive(period) && openStatusModal(period, assign)}
                                                                                                    className={`border rounded-xl p-3 shadow-xs transition-all flex flex-col justify-between min-h-[90px] group ${isUpdatePermitted && !isComplete && isPeriodDueDateActive(period)
                                                                                                        ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer"
                                                                                                        : isComplete
                                                                                                            ? "bg-emerald-50/40 border-emerald-200 cursor-default"
                                                                                                            : "bg-slate-50/50 border-slate-200/60 opacity-60 cursor-not-allowed"
                                                                                                        }`}
                                                                                                    title={
                                                                                                        isComplete
                                                                                                            ? `Completed — record locked`
                                                                                                            : !isPeriodDueDateActive(period)
                                                                                                                ? `Only the currently running due date (${getPeriodDueDate(period)}) can be updated`
                                                                                                                : isUpdatePermitted
                                                                                                                    ? undefined
                                                                                                                    : `Restricted (Only assigned staff: ${assignedStaffs.map(e => e.name || e.username).join(', ')})`
                                                                                                    }
                                                                                                >
                                                                                                    <div className="flex items-start justify-between gap-1.5">
                                                                                                        <span className={`text-xs font-semibold leading-tight truncate ${isUpdatePermitted ? "text-slate-700 group-hover:text-indigo-600" : "text-slate-400"
                                                                                                            }`}>
                                                                                                            {period.period_name}
                                                                                                        </span>
                                                                                                        <FiInfo className={`w-3 h-3 shrink-0 ${isUpdatePermitted ? "text-slate-350 group-hover:text-indigo-400" : "text-slate-200"
                                                                                                            }`} />
                                                                                                    </div>
                                                                                                    <div className="mt-2.5 space-y-1.5">
                                                                                                        <span className={`text-[11px] font-bold block ${isUpdatePermitted ? "text-slate-808" : "text-slate-400"
                                                                                                            }`}>
                                                                                                            ₹{formatCurrency(period.amount)}
                                                                                                        </span>
                                                                                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${isUpdatePermitted
                                                                                                            ? (STATUS_BADGES[period.status] || 'bg-slate-50')
                                                                                                            : 'bg-slate-100/70 border-slate-200/50 text-slate-400'
                                                                                                            }`}>
                                                                                                            {period.status}
                                                                                                        </span>
                                                                                                        <div className="text-[11px] text-slate-500 font-semibold mt-1">
                                                                                                            Due: {getPeriodDueDate(period)}
                                                                                                        </div>
                                                                                                        {/* Share Invoice button for Complete periods */}
                                                                                                        {isComplete && (
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={(e) => { e.stopPropagation(); setShareModal({ open: true, period, assign }); setSharePhone(''); setShareEmail(''); }}
                                                                                                                className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                                                                            >
                                                                                                                <FiShare2 className="w-2.5 h-2.5" />
                                                                                                                Share Invoice
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        });
                                                                                })()}
                                                                            </div>
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
                </div>
            </div>

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
                                    <h3 className="text-sm font-bold">Assign Recurring Task</h3>
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
                                                        onClick={() => {
                                                            setSelectedFirm(null);
                                                            setAssignForm(prev => ({ ...prev, firm_id: '' }));
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
                                                                    onClick={() => {
                                                                        setSelectedFirm(f);
                                                                        setAssignForm(prev => ({ ...prev, firm_id: f.id }));
                                                                        setFirmSearchQuery('');
                                                                        setFirmSearchResults([]);
                                                                        setShowFirmDropdown(false);
                                                                    }}
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
                                    )}

                                    {assignForm.targetType === 'multiple' && (
                                        <div className="space-y-1 relative">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Client Firms *</label>
                                            {assignForm.firms?.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2 p-2 border border-slate-200 rounded-xl bg-slate-50">
                                                    {assignForm.firms.map(firmId => {
                                                        const firmInfo = selectedFirmsData.find(f => f.id === firmId);
                                                        return (
                                                            <span key={firmId} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-705 shadow-xs">
                                                                <span>{firmInfo?.name || firmId}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setAssignForm(prev => ({
                                                                            ...prev,
                                                                            firms: prev.firms.filter(x => x !== firmId)
                                                                        }));
                                                                    }}
                                                                    className="text-slate-400 hover:text-slate-655"
                                                                >
                                                                    <FiX className="w-3.5 h-3.5" />
                                                                </button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
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
                                                    placeholder="Search and add client firms (min 3 chars)…"
                                                    className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                                />
                                                {showFirmDropdown && firmSearchResults.length > 0 && (
                                                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                                        {firmSearchResults
                                                            .filter(f => !assignForm.firms?.includes(f.id))
                                                            .map(f => (
                                                                <button
                                                                    key={f.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedFirmsData(prev => {
                                                                            if (!prev.find(x => x.id === f.id)) {
                                                                                return [...prev, f];
                                                                            }
                                                                            return prev;
                                                                        });
                                                                        setAssignForm(prev => ({
                                                                            ...prev,
                                                                            firms: [...(prev.firms || []), f.id]
                                                                        }));
                                                                        setFirmSearchQuery('');
                                                                        setFirmSearchResults([]);
                                                                        setShowFirmDropdown(false);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs flex flex-col"
                                                                >
                                                                    <span className="font-semibold text-slate-800">{f.name}</span>
                                                                    <span className="text-[10px] text-slate-400 mt-0.5">Client: {f.client_name} · PAN: {f.pan_no}</span>
                                                                </button>
                                                            ))}
                                                    </div>
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
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Recurring Task *</label>
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
                                            <option value="">Select recurring task template…</option>
                                            {services.map(s => (
                                                <option key={s.id} value={s.service_id}>{s.name} (₹{formatCurrency(s.default_amount)})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* pay_from_month (for monthly frequency only) */}
                                    {(() => {
                                        const selectedService = services.find(s => s.service_id === assignForm.service_id);
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
                                        const selectedService = services.find(s => s.service_id === assignForm.service_id);
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
                                </div>
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        className="flex-1 py-2.5 text-xs font-semibold text-slate-605 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
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
                                                <option value="Outsource">Outsource</option>
                                                <option value="N/A">N/A</option>
                                            </select>
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
                                                className="w-full px-3 py-2.5 text-xs text-slate-705 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Ledger notice info */}
                                        {statusForm.status === 'Complete' && (
                                            <div className="flex gap-2.5 bg-emerald-50 border border-emerald-150 rounded-xl p-3 text-emerald-800">
                                                <FiCheckCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-600" />
                                                <p className="text-[10.5px] leading-relaxed font-medium">
                                                    Marking as <strong>Complete</strong> will automatically generate a sales invoice and post it to this client firm's ledger. This action <strong>locks</strong> the record.
                                                </p>
                                            </div>
                                        )}
                                        {(selectedPeriod.status === 'Complete' || selectedPeriod.status === 'Sale') && statusForm.status !== 'Complete' && statusForm.status !== 'Sale' && (
                                            <div className="flex gap-2.5 bg-amber-50 border border-amber-150 rounded-xl p-3 text-amber-800">
                                                <FiAlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-655" />
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

            {/* Modal: Edit Assignment */}
            <AnimatePresence>
                {showEditModal && editAssignment && (() => {
                    const svc = services.find(s => String(s.service_id) === String(editAssignment.service_id));
                    const isGstr1 = editAssignment.service_id === 'GSTR-1' || (svc?.name && /gstr-1/i.test(svc.name));
                    const editFreq = isGstr1 ? 'monthly' : (svc?.frequency?.toLowerCase() || editAssignment.frequency?.toLowerCase() || '');

                    return (
                        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                            <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
                                onClick={() => setShowEditModal(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97, y: 20 }}
                                className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-md my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
                                    <div className="flex items-center gap-2">
                                        <FiEdit2 className="w-5 h-5" />
                                        <h3 className="text-sm font-bold">Edit Assignment</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Info Banner */}
                                <div className="bg-violet-50 border-b border-violet-100 px-5 py-3 shrink-0">
                                    <p className="text-[11px] font-bold text-violet-700">{editAssignment.firm_name}</p>
                                    <p className="text-[10px] text-violet-500 mt-0.5">{editAssignment.service_name} · {editAssignment.financial_year}</p>
                                </div>

                                <form onSubmit={handleEditSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                                    <div
                                        className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        {/* Custom Amount */}
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Fees Amount (₹) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={editForm.custom_amount}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, custom_amount: e.target.value }))}
                                                className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
                                            />
                                        </div>

                                        {/* Pay From Month (monthly only) */}
                                        {editFreq === 'monthly' && (
                                            <div className="space-y-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Start Generating From Month (Optional)</label>
                                                <select
                                                    value={editForm.pay_from_month}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, pay_from_month: e.target.value }))}
                                                    className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
                                                >
                                                    <option value="">Default (April)</option>
                                                    {['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'].map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Quarters (quarterly only) */}
                                        {editFreq === 'quarterly' && (
                                            <div className="space-y-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Quarters (Optional)</label>
                                                <div className="flex gap-4">
                                                    {[1, 2, 3, 4].map(q => (
                                                        <label key={q} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={editForm.quarters?.includes(q)}
                                                                onChange={(e) => {
                                                                    setEditForm(prev => {
                                                                        const current = prev.quarters || [];
                                                                        const updated = e.target.checked
                                                                            ? [...current, q]
                                                                            : current.filter(x => x !== q);
                                                                        return { ...prev, quarters: updated };
                                                                    });
                                                                }}
                                                                className="rounded border-slate-350 text-violet-600 focus:ring-violet-500 h-4 w-4"
                                                            />
                                                            Q{q}
                                                        </label>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-400">Leave unselected to keep all quarters.</p>
                                            </div>
                                        )}

                                        {/* Assigned Staff */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Staff *</label>
                                                {editForm.employee_usernames?.length > 0 && (
                                                    <span className="text-[10px] font-semibold text-violet-650 bg-violet-50 px-2 py-0.5 rounded-full">
                                                        {editForm.employee_usernames.length} selected
                                                    </span>
                                                )}
                                            </div>
                                            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                                                <div className="relative border-b border-slate-100 px-3 py-2 bg-slate-50">
                                                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Filter staff list..."
                                                        value={editStaffSearchQuery}
                                                        onChange={(e) => setEditStaffSearchQuery(e.target.value)}
                                                        className="w-full pl-6 pr-2 py-1 text-xs text-slate-700 bg-transparent outline-none placeholder-slate-400 focus:ring-0"
                                                    />
                                                </div>
                                                <div className="max-h-36 overflow-y-auto p-3 space-y-2">
                                                    {(() => {
                                                        const query = editStaffSearchQuery.trim().toLowerCase();
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
                                                            const checked = editForm.employee_usernames?.includes(s.username);
                                                            return (
                                                                <label key={s.username} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={(e) => {
                                                                            setEditForm(prev => {
                                                                                const current = prev.employee_usernames || [];
                                                                                const updated = e.target.checked
                                                                                    ? [...current, s.username]
                                                                                    : current.filter(x => x !== s.username);
                                                                                return { ...prev, employee_usernames: updated };
                                                                            });
                                                                        }}
                                                                        className="rounded border-slate-350 text-violet-650 focus:ring-violet-500 h-4 w-4"
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
                                            {editSelectedCa ? (
                                                <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{editSelectedCa.name}</p>
                                                        <p className="text-[10px] text-slate-400">Username: {editSelectedCa.username}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditSelectedCa(null);
                                                            setEditForm(prev => ({ ...prev, ca_id: '' }));
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
                                                        value={editCaSearchQuery}
                                                        onChange={(e) => {
                                                            setEditCaSearchQuery(e.target.value);
                                                            setShowEditCaDropdown(true);
                                                        }}
                                                        onFocus={() => setShowEditCaDropdown(true)}
                                                        placeholder="Search CA (min 3 chars)…"
                                                        className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
                                                    />
                                                    {showEditCaDropdown && editCaSearchResults.length > 0 && (
                                                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                                            {editCaSearchResults.map(c => (
                                                                <button
                                                                    key={c.username}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditSelectedCa(c);
                                                                        setEditForm(prev => ({ ...prev, ca_id: c.username }));
                                                                        setEditCaSearchQuery('');
                                                                        setEditCaSearchResults([]);
                                                                        setShowEditCaDropdown(false);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs flex flex-col"
                                                                >
                                                                    <span className="font-semibold text-slate-800">{c.name}</span>
                                                                    <span className="text-[10px] text-slate-400 mt-0.5">Username: {c.username}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {editCaSearchLoading && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <span className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin block" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status */}
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assignment Status</label>
                                            <select
                                                value={editForm.status}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                                className="w-full px-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="paused">Paused</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowEditModal(false)}
                                            className="flex-1 py-2.5 text-xs font-semibold text-slate-605 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={
                                                submittingEdit ||
                                                !editForm.custom_amount ||
                                                (!editForm.employee_usernames || editForm.employee_usernames.length === 0)
                                            }
                                            className="flex-1 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            {submittingEdit && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* Modal: Delete Assignment Confirmation */}
            <AnimatePresence>
                {confirmDeleteId && (
                    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 pointer-events-none">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto" onClick={() => setConfirmDeleteId(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-5 py-4 flex flex-col items-center gap-3 text-center">
                                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                                    <FiTrash2 className="w-5 h-5 text-rose-600" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">Delete Assignment?</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    This will permanently delete the recurring task assignment and all its schedule periods. This action cannot be undone.
                                </p>
                            </div>
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deletingAssignmentId === confirmDeleteId}
                                    onClick={async () => {
                                        setDeletingAssignmentId(confirmDeleteId);
                                        try {
                                            await axios.delete(`${API_BASE_URL}/recurring-task/assignments/${confirmDeleteId}`, { headers: getHeaders() });
                                            toast.success('Assignment deleted successfully');
                                            setConfirmDeleteId(null);
                                            setSelectedAssignmentId(null);
                                            fetchAssignments();
                                        } catch (err) {
                                            toast.error(err?.response?.data?.message || 'Failed to delete assignment');
                                        } finally {
                                            setDeletingAssignmentId(null);
                                        }
                                    }}
                                    className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {deletingAssignmentId === confirmDeleteId && (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    Delete
                                </button>
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
                                    <p className="text-[11px] text-emerald-600">Amount: ₹{formatCurrency(shareModal.period?.amount)}</p>
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
                                    className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!sharePhone && !shareEmail) { toast.error('Enter at least one contact'); return; }
                                        const msg = `Hi, your invoice for ${shareModal.assign?.service_name} (${shareModal.period?.period_name}) is ₹${formatCurrency(shareModal.period?.amount)}. Status: Complete.`;
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

            {/* Modal: Broadcast Reminder */}
            <AnimatePresence>
                {broadcastModal.open && broadcastModal.assign && (
                    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 pointer-events-none">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto" onClick={() => setBroadcastModal({ open: false, assign: null })} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                                <div className="flex items-center gap-2">
                                    <FiShare2 className="w-5 h-5" />
                                    <h3 className="text-sm font-bold">Broadcast Recurring Task Reminder</h3>
                                </div>
                                <button onClick={() => setBroadcastModal({ open: false, assign: null })} className="p-1 hover:bg-white/10 rounded-lg">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800">
                                    <p className="font-bold">{broadcastModal.assign?.firm_name}</p>
                                    <p className="text-[11px] text-indigo-650 mt-0.5">{broadcastModal.assign?.service_name}</p>
                                    <p className="text-[11px] text-indigo-605">Financial Year: {broadcastModal.assign?.financial_year}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number</label>
                                    <div className="relative">
                                        <FaWhatsapp className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 w-4 h-4" />
                                        <input
                                            type="tel"
                                            value={broadcastPhone}
                                            onChange={(e) => setBroadcastPhone(e.target.value)}
                                            placeholder="+91 9876543210"
                                            className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                                        <input
                                            type="email"
                                            value={broadcastEmail}
                                            onChange={(e) => setBroadcastEmail(e.target.value)}
                                            placeholder="client@example.com"
                                            className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBroadcastModal({ open: false, assign: null })}
                                    className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!broadcastPhone && !broadcastEmail) { toast.error('Enter at least one contact'); return; }
                                        const msg = `Dear Client, this is a friendly reminder regarding your recurring task "${broadcastModal.assign?.service_name}" for the financial year ${broadcastModal.assign?.financial_year}. Please ensure any pending requirements are shared with us so we can proceed. Thank you!`;
                                        if (broadcastPhone) window.open(`https://wa.me/${broadcastPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                        if (broadcastEmail) window.open(`mailto:${broadcastEmail}?subject=Recurring Task Reminder - ${broadcastModal.assign?.service_name}&body=${encodeURIComponent(msg)}`);
                                        setBroadcastModal({ open: false, assign: null });
                                        toast.success('Reminder broadcasted successfully!');
                                    }}
                                    className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <FiShare2 className="w-3.5 h-3.5" />
                                    Send Broadcast
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Show Full 12-Month Calendar */}
            <AnimatePresence>
                {showFullCalendarModal && fullCalendarAssignment && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto" onClick={() => { setShowFullCalendarModal(false); setFullCalendarAssignment(null); }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <FiCalendar className="w-5 h-5" />
                                    <div>
                                        <h3 className="text-sm font-bold">Full Calendar: {fullCalendarAssignment.firm_name}</h3>
                                        <p className="text-[11px] text-white/85">{fullCalendarAssignment.service_name} · FY {fullCalendarAssignment.financial_year}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setShowFullCalendarModal(false); setFullCalendarAssignment(null); }} className="p-1.5 hover:bg-white/10 rounded-lg text-white">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 min-h-0">
                                {schedulesLoading ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-xs">Loading all schedules...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {schedules.map((period) => {
                                            const assignedStaffs = getAssignedStaffList(fullCalendarAssignment);
                                            const assignedStaffUsernames = assignedStaffs.map(emp => (emp.username || '').toLowerCase().trim());
                                            const isUpdatePermitted = !currentUsername || assignedStaffUsernames.length === 0 || assignedStaffUsernames.includes(currentUsername);
                                            const isComplete = period.status === 'Complete' || period.status === 'Sale';

                                            return (
                                                <div
                                                    key={period.schedule_id}
                                                    onClick={() => isUpdatePermitted && !isComplete && isPeriodDueDateActive(period) && openStatusModal(period, fullCalendarAssignment)}
                                                    className={`border rounded-xl p-4 transition-all flex flex-col justify-between min-h-[105px] group ${isUpdatePermitted && !isComplete && isPeriodDueDateActive(period)
                                                        ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer"
                                                        : isComplete
                                                            ? "bg-emerald-50/40 border-emerald-200 cursor-default"
                                                            : "bg-slate-50/50 border-slate-200/60 opacity-60 cursor-not-allowed"
                                                        }`}
                                                    title={
                                                        isComplete
                                                            ? `Completed — record locked`
                                                            : !isPeriodDueDateActive(period)
                                                                ? `Only the currently running due date (${getPeriodDueDate(period)}) can be updated`
                                                                : isUpdatePermitted
                                                                    ? undefined
                                                                    : `Restricted (Only assigned staff: ${assignedStaffs.map(e => e.name || e.username).join(', ')})`
                                                    }
                                                >
                                                    <div className="flex items-start justify-between gap-1">
                                                        <span className="text-xs font-bold text-slate-705 group-hover:text-indigo-600">
                                                            {period.period_name}
                                                        </span>
                                                        <FiInfo className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                                                    </div>
                                                    <div className="mt-3 space-y-2">
                                                        <span className="text-xs font-extrabold text-slate-850 block">
                                                            ₹{formatCurrency(period.amount)}
                                                        </span>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${STATUS_BADGES[period.status] || 'bg-slate-50'}`}>
                                                                {period.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 font-semibold">
                                                            Due: {getPeriodDueDate(period)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                                <button
                                    type="button"
                                    onClick={() => { setShowFullCalendarModal(false); setFullCalendarAssignment(null); }}
                                    className="px-5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-white transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ComplianceServices;
