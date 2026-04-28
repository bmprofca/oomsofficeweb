import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Sidebar, Header } from '../components/header';
import {
    FiUser,
    FiClock,
    FiDollarSign,
    FiAward,
    FiBriefcase,
    FiBookOpen,
    FiTrendingUp,
    FiFileText,
    FiCalendar,
    FiMail,
    FiPhone,
    FiMapPin,
    FiHome,
    FiChevronRight,
    FiRefreshCw,
    FiX,
    FiStar,
    FiMaximize2,
    FiMinimize2,
    FiAlertCircle,
    FiCheckSquare,
    FiCoffee // Added for break icon
} from 'react-icons/fi';
import  API_BASE_URL  from '../utils/api-controller';
import  getHeaders  from '../utils/get-headers';
// Import tab components
import ProfileTab from '../staff/ProfileTab';
import AttendanceTab from '../staff/AttendanceTab';
import ExpenseTab from '../staff/ExpenseTab';
import BonusFineTab from '../staff/BonusFineTab';
import SalaryTab from '../staff/SalaryTab';
import LedgerTab from '../staff/LedgerTab';
import LoanTab from '../staff/LoanTab';
import PerformanceTab from '../staff/PerformanceTab';
import EntryReportTab from '../staff/EntryReportTab';
import TaskTab from '../staff/StaffTaskTab';
import StaffPayslip from '../staff/StaffPayslip';

// TabLink Component
const TabLink = ({ to, icon: Icon, label, isActive, onClick }) => {
    return (
        <motion.button
            onClick={() => onClick(to)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                }`}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.98 }}
        >
            <motion.div
                animate={{
                    rotate: isActive ? [0, 5, 0] : 0,
                    scale: isActive ? 1.1 : 1
                }}
                transition={{ duration: 0.2 }}
                className="mb-1"
            >
                <Icon className="w-4 h-4" />
            </motion.div>
            <span className="text-xs font-medium text-center leading-tight">{label}</span>
        </motion.button>
    );
};

// CompactTabIcon Component for minimized view
const CompactTabIcon = ({ to, icon: Icon, label, isActive, onClick }) => {
    return (
        <motion.button
            onClick={() => onClick(to)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[70px] ${isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                }`}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
        >
            <Icon className="w-4 h-4 mb-1 mx-auto" />
            <span className="text-[10px] font-medium text-center leading-tight w-full">{label}</span>
        </motion.button>
    );
};

// Break Status Popup Component
const BreakStatusPopup = ({ isOpen, onClose, breakStartTime, onBreakEnd, staffName }) => {
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    useEffect(() => {
        if (!isOpen || !breakStartTime) return;

        const breakStartDate = new Date(breakStartTime);
        
        const updateElapsedTime = () => {
            const now = new Date();
            const diff = Math.floor((now - breakStartDate) / 1000); // Difference in seconds
            
            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;
            
            setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateElapsedTime(); // Initial update
        const interval = setInterval(updateElapsedTime, 1000);

        return () => clearInterval(interval);
    }, [isOpen, breakStartTime]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                            <FiCoffee className="w-6 h-6 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">On Break</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiX className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-700">
                        <span className="font-semibold">{staffName || 'Staff member'}</span> is currently on break.
                    </p>
                    
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <p className="text-sm font-medium text-amber-800 mb-2">Break Details</p>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Started at:</span>
                                <span className="font-medium text-gray-900">
                                    {new Date(breakStartTime).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-mono font-medium text-amber-700">{elapsedTime}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-medium text-gray-900">
                                    {new Date(breakStartTime).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-sm text-blue-800 flex items-start gap-2">
                            <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>Actions are restricted while on break. Please end the break before performing any operations.</span>
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onBreakEnd}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                            End Break
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

const StaffProfile = () => {
    const navigate = useNavigate();
    const { tab } = useParams();
    const location = useLocation();

    const [username, setUsername] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [tabsMinimized, setTabsMinimized] = useState(() => {
        const saved = localStorage.getItem('staffTabsMinimized');
        return saved ? JSON.parse(saved) : true;
    });
    const [activeTab, setActiveTab] = useState(tab || 'profile');
    const [showSettings, setShowSettings] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);

    // Loading and error states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAccepted, setIsAccepted] = useState(false);

    // Break status states
    const [showBreakPopup, setShowBreakPopup] = useState(false);
    const [breakStatus, setBreakStatus] = useState({
        onBreak: false,
        breakStartTime: null
    });

    // Staff data state
    const [staffData, setStaffData] = useState({
        firstName: "",
        lastName: "",
        fullName: "",
        email: "",
        phone: "",
        joinDate: "",
        balance: "0.00",
        designation: "",
        dateOfBirth: "",
        gender: "",
        username: "",
        address: {
            state: "",
            district: "",
            city: "",
            line1: "",
            line2: ""
        }
    });

    // Sample data for tabs
    const [attendance, setAttendance] = useState({
        month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        summary: {
            totalDays: 0,
            notMarked: 0,
            present: 0,
            absent: 0,
            halfDay: 0,
            overTime: "00 H : 00 M",
            fineHours: "00 H : 00 M",
            paidLeave: 0
        },
        calendar: []
    });

    const [expenses, setExpenses] = useState([]);
    const [bonusFine, setBonusFine] = useState([]);
    const [salary, setSalary] = useState({ list: [] });
    const [ledger, setLedger] = useState({
        period: "",
        entries: [],
        openingBalance: "0.00",
        totalDebit: "0.00",
        totalCredit: "0.00",
        closingBalance: "0.00"
    });
    const [loan, setLoan] = useState({
        period: "",
        entries: [],
        openingBalance: "0.00",
        totalDebit: "0.00",
        totalCredit: "0.00",
        closingBalance: "0.00"
    });
    const [performance, setPerformance] = useState({
        period: "",
        services: [],
        tasks: []
    });
    const [entryReport, setEntryReport] = useState({
        month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        entries: []
    });
    const [tasks, setTasks] = useState([]);

    // Extract username from URL query params on component mount
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const usernameParam = searchParams.get('username');

        if (usernameParam) {
            setUsername(usernameParam);
            console.log('Username from URL:', usernameParam);
        } else {
            const savedUsername = localStorage.getItem('selectedStaffUsername');
            if (savedUsername) {
                setUsername(savedUsername);
            } else {
                setError('No username provided');
                setLoading(false);
            }
        }
    }, [location]);

    // Update active tab when URL changes
    useEffect(() => {
        if (tab) {
            setActiveTab(tab);
        }
    }, [tab]);

    // Handle default tab
    useEffect(() => {
        if (!tab && username) {
            navigate(`/staff/view/profile/profile?username=${username}`, { replace: true });
        }
    }, [tab, navigate, username]);

    // Persist tabs minimized state
    useEffect(() => {
        localStorage.setItem('staffTabsMinimized', JSON.stringify(tabsMinimized));
    }, [tabsMinimized]);

    // Check mobile view on resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch staff profile data when username is available
    useEffect(() => {
        if (username) {
            fetchStaffProfile();
            fetchBreakStatus(); // Fetch break status when page opens
            localStorage.setItem('selectedStaffUsername', username);
        }
    }, [username]);

    // Function to fetch break status
    const fetchBreakStatus = async () => {
        if (!username) return;

        try {
            const headers = await getHeaders();
            if (!headers) {
                console.error('Authentication failed');
                return;
            }

            console.log(`Fetching break status for username: ${username}`);
            
            const response = await fetch(
                `${API_BASE_URL}/attendance/break/status?username=${username}`,
                {
                    method: 'GET',
                    headers: headers
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch break status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Break status response:', data);

            if (data.success) {
                setBreakStatus({
                    onBreak: data.onBreak,
                    breakStartTime: data.breakStartTime || null
                });

                // Show popup if staff is on break
                if (data.onBreak && data.onBreak === true) {
                    setShowBreakPopup(true);
                }
            }
        } catch (error) {
            console.error('Error fetching break status:', error);
        }
    };

   // Function to handle ending the break
const handleEndBreak = async () => {
    try {
        const headers = await getHeaders();
        if (!headers) {
            throw new Error('Authentication failed');
        }

        // Call API to end break - passing username in body
        const response = await fetch(
            `${API_BASE_URL}/attendance/break/end`,
            {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username }) // Pass username in body
            }
        );

        if (!response.ok) {
            throw new Error('Failed to end break');
        }

        const data = await response.json();
        
        if (data.success) {
            // Update break status
            setBreakStatus({
                onBreak: false,
                breakStartTime: null
            });
            setShowBreakPopup(false);
            
            // Optional: Show success message
            console.log('Break ended successfully');
        } else {
            throw new Error(data.message || 'Failed to end break');
        }
    } catch (error) {
        console.error('Error ending break:', error);
        alert('Failed to end break. Please try again.');
    }
};

    // Function to fetch staff profile from API
    const fetchStaffProfile = async () => {
        setLoading(true);
        setError(null);

        try {
            const headers = await getHeaders();
            if (!headers) {
                throw new Error('Authentication failed. Please login again.');
            }

            console.log(`Fetching staff profile for username: ${username}`);

            const response = await fetch(
                `${API_BASE_URL}/settings/staff/profile/${username}`,
                {
                    method: 'GET',
                    headers: headers
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Staff member not found');
                } else if (response.status === 401) {
                    throw new Error('Unauthorized. Please login again.');
                } else if (response.status === 403) {
                    throw new Error('You do not have permission to view this profile');
                } else {
                    throw new Error(`Failed to fetch profile: ${response.status}`);
                }
            }

            const responseData = await response.json();
            console.log('Staff profile response:', responseData);

            if (responseData.success && responseData.data && responseData.data.length > 0) {
                const staffMember = responseData.data[0];
                const isAcceptedStaff = staffMember.is_accepted === true;
                setIsAccepted(isAcceptedStaff);
                const branchInfo = staffMember.branch || {};

                const formattedPhone = staffMember.mobile
                    ? `${staffMember.country_code ? '+' + staffMember.country_code : ''} ${staffMember.mobile}`.trim()
                    : '';

                const transformedData = {
                    firstName: staffMember.name?.split(' ')[0] || '',
                    lastName: staffMember.name?.split(' ').slice(1).join(' ') || '',
                    fullName: staffMember.name || 'Unknown',
                    email: staffMember.email || '',
                    phone: formattedPhone,
                    joinDate: staffMember.create_date ? formatDate(staffMember.create_date) : '',
                    balance: "0.00",
                    designation: staffMember.designation || 'Not Assigned',
                    dateOfBirth: staffMember.date_of_birth ? formatDate(staffMember.date_of_birth) : '',
                    gender: staffMember.gender || '',
                    username: staffMember.username || username,
                    status: staffMember.status === true,
                    userStatus: staffMember.user_status === true,
                    is_accepted: staffMember.is_accepted === true,
                    address: {
                        state: staffMember.state || '',
                        district: staffMember.district || '',
                        city: staffMember.city || '',
                        line1: staffMember.address_line_1 || '',
                        line2: staffMember.address_line_2 || '',
                        pincode: staffMember.pincode || '',
                        country: staffMember.country || ''
                    },
                    branch: {
                        id: branchInfo.id,
                        db_id: branchInfo.db_id,
                        name: branchInfo.name,
                        logo: branchInfo.logo,
                        address: branchInfo.address || {
                            line1: null,
                            line2: null,
                            city: null,
                            state: null,
                            country: null,
                            pincode: null
                        },
                        tax_info: branchInfo.tax_info || {
                            pan: "",
                            gst: ""
                        }
                    },
                    profile_id: staffMember.profile_id,
                    care_of: staffMember.care_of,
                    guardian_name: staffMember.guardian_name,
                    country_code: staffMember.country_code,
                    pan_number: staffMember.pan_number,
                    village_town: staffMember.village_town,
                    image: staffMember.image
                };

                setStaffData(transformedData);
                console.log('Transformed staff data:', transformedData);

                fetchAttendanceData();
                fetchExpensesData();
                fetchBonusFineData();
                fetchSalaryData();
                fetchLedgerData();
                fetchLoanData();
                fetchPerformanceData();
                fetchEntryReportData();
                fetchTasksData();

            } else {
                throw new Error('No staff data found');
            }

        } catch (err) {
            console.error('Error fetching staff profile:', err);
            setError(err.message || 'Failed to load staff profile');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('en-GB');
        } catch (e) {
            return '';
        }
    };
    
    // Function to generate calendar data for attendance
    const generateCalendarData = () => {
        const days = [];
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: i,
                day: new Date(new Date().getFullYear(), new Date().getMonth(), i).toLocaleDateString('en-US', { weekday: 'short' }),
                status: null
            });
        }
        return days;
    };

    // API calls for other tabs
    const fetchAttendanceData = async () => {
        try {
            setAttendance(prev => ({
                ...prev,
                calendar: generateCalendarData()
            }));
        } catch (error) {
            console.error('Error fetching attendance:', error);
        }
    };

    const fetchExpensesData = async () => {
        setExpenses([]);
    };

    const fetchBonusFineData = async () => {
        setBonusFine([]);
    };

    const fetchSalaryData = async () => {
        setSalary({ list: [] });
    };

    const fetchLedgerData = async () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setLedger({
            period: `${formatDate(firstDay)} - ${formatDate(lastDay)}`,
            entries: [],
            openingBalance: "0.00",
            totalDebit: "0.00",
            totalCredit: "0.00",
            closingBalance: "0.00"
        });
    };

    const fetchLoanData = async () => {
        const today = new Date();
        const startDate = formatDate(today);
        const endDate = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate());

        setLoan({
            period: `${startDate} - ${formatDate(endDate)}`,
            entries: [],
            openingBalance: "0.00",
            totalDebit: "0.00",
            totalCredit: "0.00",
            closingBalance: "0.00"
        });
    };

    const fetchPerformanceData = async () => {
        const today = new Date();
        const startDate = formatDate(today);
        const endDate = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate());

        setPerformance({
            period: `${startDate} - ${formatDate(endDate)}`,
            services: [],
            tasks: generateTaskData()
        });
    };

    const fetchEntryReportData = async () => {
        setEntryReport({
            month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            entries: []
        });
    };

    const fetchTasksData = async () => {
        try {
            setTasks(generateTaskData());
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setTasks([]);
        }
    };

    const generateTaskData = () => {
        return [
            {
                id: 1,
                createDate: formatDate(new Date()),
                dueDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                targetDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                task: "Income Tax Return",
                fees: "2000.00",
                client: "Sample Client",
                assignor: "Admin",
                pan: "XXXXX1234A",
                mobile: "9876543210",
                status: "ASSIGNED"
            },
            {
                id: 2,
                createDate: formatDate(new Date()),
                dueDate: formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
                targetDate: formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
                task: "GST Filing",
                fees: "1500.00",
                client: "ABC Corp",
                assignor: "Admin",
                pan: "XXXXX5678B",
                mobile: "9876543211",
                status: "IN_PROGRESS"
            },
            {
                id: 3,
                createDate: formatDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
                dueDate: formatDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
                targetDate: formatDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
                task: "TDS Return",
                fees: "1000.00",
                client: "XYZ Ltd",
                assignor: "Manager",
                pan: "XXXXX9012C",
                mobile: "9876543212",
                status: "PENDING"
            }
        ];
    };

    const profileTabs = [
        { id: 'profile', name: 'Profile', icon: FiUser },
        { id: 'attendance', name: 'Attendance', icon: FiClock },
        { id: 'expense', name: 'Expense', icon: FiDollarSign },
        { id: 'bonus-fine', name: 'Bonus/Fine', icon: FiAward },
        { id: 'salary', name: 'Salary', icon: FiBriefcase },
        { id: 'ledger', name: 'Ledger', icon: FiBookOpen },
        { id: 'loan', name: 'Loan', icon: FiDollarSign },
        { id: 'performance', name: 'Performance', icon: FiTrendingUp },
        { id: 'entry-report', name: 'Entry Report', icon: FiFileText },
        { id: 'task', name: 'Task', icon: FiCheckSquare },
        { id: 'payslip', name: 'Payslip', icon: FiFileText }
    ];

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(`/staff/view/profile/${tabId}?username=${username}`);
        setShowSettings(false);
    };

    const toggleTabsMinimized = () => {
        setTabsMinimized(!tabsMinimized);
    };

    const handleRefresh = () => {
        if (username) {
            fetchStaffProfile();
            fetchBreakStatus(); // Also refresh break status
        }
    };

    const handleGoBack = () => {
        navigate('/staff/view');
    };

    const tabContentVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
    };

    const renderTabContent = () => {
        const props = {
            variants: tabContentVariants,
            staffData,
            username,
            isAccepted,
            isOnBreak: breakStatus.onBreak // Pass break status to tabs
        };

        switch (activeTab) {
            case 'profile':
                return <ProfileTab key="profile" staffData={staffData} setStaffData={setStaffData} username={username} {...props} />;
            case 'attendance':
                return <AttendanceTab key="attendance" attendance={attendance} setAttendance={setAttendance} username={username} {...props} />;
            case 'expense':
                return <ExpenseTab key="expense" expenses={expenses} setExpenses={setExpenses} username={username} staffUsername={username}     {...props} />;
            case 'bonus-fine':
                return <BonusFineTab key="bonus-fine" bonusFine={bonusFine} setBonusFine={setBonusFine} username={username} {...props} />;
            case 'salary':
                return <SalaryTab key="salary" salary={salary} setSalary={setSalary} username={username} {...props} />;
            case 'ledger':
                return <LedgerTab key="ledger" ledger={ledger} setLedger={setLedger} username={username} {...props} />;
            case 'loan':
                return <LoanTab key="loan" loan={loan} setLoan={setLoan} username={username} {...props} />;
            case 'performance':
                return <PerformanceTab key="performance" performance={performance} setPerformance={setPerformance} staffUsername={username} {...props} />;
            case 'entry-report':
                return <EntryReportTab key="entry-report" entryReport={entryReport} setEntryReport={setEntryReport} username={username} {...props} />;
            case 'task':
                return <TaskTab key="task" tasks={tasks} setTasks={setTasks} username={username} {...props} />;
            case 'payslip':
                return <StaffPayslip key="payslip" username={username} variants={tabContentVariants} {...props} />;
            default:
                return null;
        }
    };

    // Loading skeleton
    const LoadingSkeleton = () => (
        <div className="min-h-screen bg-gray-50">
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
                    <div className="animate-pulse">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                            <div className="h-4 bg-gray-200 rounded w-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                                    <div>
                                        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    </div>
                                </div>
                                <div className="h-10 bg-gray-200 rounded w-32"></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 p-3">
                            <div className="grid grid-cols-5 gap-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                            <div className="space-y-4">
                                <div className="h-8 bg-gray-200 rounded w-48"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-24 bg-gray-200 rounded"></div>
                                    <div className="h-24 bg-gray-200 rounded"></div>
                                    <div className="h-24 bg-gray-200 rounded"></div>
                                    <div className="h-24 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Error component
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
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
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center"
                        >
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiAlertCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <div className="flex justify-center gap-4">
                                <motion.button
                                    onClick={handleRefresh}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiRefreshCw className="w-4 h-4" />
                                    Try Again
                                </motion.button>
                                <motion.button
                                    onClick={handleGoBack}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Back to Staff List
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading || !username) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
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

            {/* Break Status Popup */}
            <BreakStatusPopup
                isOpen={showBreakPopup}
                onClose={() => setShowBreakPopup(false)}
                breakStartTime={breakStatus.breakStartTime}
                onBreakEnd={handleEndBreak}
                staffName={staffData.fullName}
            />

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Breadcrumb Navigation */}
                        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                            <button
                                onClick={handleGoBack}
                                className="hover:text-blue-600 flex items-center gap-1"
                            >
                                <FiHome className="w-4 h-4" />
                                Staff
                            </button>
                            <FiChevronRight className="w-4 h-4" />
                            <span className="font-medium text-gray-900">{staffData.fullName}</span>
                            <FiChevronRight className="w-4 h-4" />
                            <span className="capitalize">{activeTab.replace('-', ' ')}</span>

                            {/* Break Status Indicator */}
                            {breakStatus.onBreak && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-lg"
                                >
                                    <FiCoffee className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm font-medium text-amber-700">On Break</span>
                                </motion.div>
                            )}

                            {/* Refresh button */}
                            <motion.button
                                onClick={handleRefresh}
                                className="ml-2 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                whileHover={{ rotate: 180 }}
                                transition={{ duration: 0.3 }}
                                title="Refresh data"
                            >
                                <FiRefreshCw className="w-4 h-4" />
                            </motion.button>
                        </div>

                        {/* Staff Header Card */}
                        <motion.div
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6 relative"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className="relative">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                                        <motion.div
                                            className="relative flex-shrink-0"
                                            whileHover={{ scale: 1.03 }}
                                        >
                                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                                {staffData.fullName ? staffData.fullName.charAt(0).toUpperCase() : '?'}
                                                {staffData.fullName && staffData.fullName.split(' ').length > 1 ? staffData.fullName.split(' ')[1].charAt(0).toUpperCase() : ''}
                                            </div>
                                            {isAccepted && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
                                            )}
                                            {breakStatus.onBreak && (
                                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center">
                                                    <FiCoffee className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </motion.div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                                                <h1 className="text-xl font-bold text-gray-900 truncate">{staffData.fullName || 'Unknown'}</h1>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${isAccepted
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    <FiStar className="w-3 h-3" />
                                                    {staffData.designation || 'Pending'}
                                                </span>
                                            </div>

                                            {/* Contact Info Grid */}
                                            <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'} gap-3`}>
                                                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <FiMail className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-gray-500">Email</p>
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{staffData.email || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <FiPhone className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-gray-500">Phone</p>
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{staffData.phone || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                                                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <FiCalendar className="w-4 h-4 text-amber-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-gray-500">Joined</p>
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{staffData.joinDate || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">
                                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <FiMapPin className="w-4 h-4 text-emerald-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-gray-500">Location</p>
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{staffData.address.city || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 lg:mt-0 flex-shrink-0">
                                        <motion.div
                                            className={`px-4 py-2 rounded-lg font-semibold shadow-sm ${isAccepted
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            Balance: ₹{staffData.balance}
                                        </motion.div>
                                    </div>
                                </div>
                            </div>

                        </motion.div>

                        {/* Enhanced Profile Tabs with Minimize Option */}
                        <motion.div
                            className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="p-3 flex items-center justify-between">
                                {tabsMinimized ? (
                                    <>
                                        <div className="flex items-center justify-center gap-1 flex-1 flex-wrap">
                                            {profileTabs.map((tabItem) => {
                                                const Icon = tabItem.icon;
                                                const isActive = activeTab === tabItem.id;
                                                return (
                                                    <CompactTabIcon
                                                        key={tabItem.id}
                                                        to={tabItem.id}
                                                        icon={Icon}
                                                        label={tabItem.name}
                                                        isActive={isActive}
                                                        onClick={handleTabChange}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <motion.button
                                            onClick={toggleTabsMinimized}
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 ml-1 flex-shrink-0"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            title="Show full tabs"
                                        >
                                            <FiMaximize2 className="w-4 h-4" />
                                        </motion.button>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 flex-1">
                                            {profileTabs.map((tabItem) => {
                                                const Icon = tabItem.icon;
                                                const isActive = activeTab === tabItem.id;
                                                return (
                                                    <TabLink
                                                        key={tabItem.id}
                                                        to={tabItem.id}
                                                        icon={Icon}
                                                        label={tabItem.name}
                                                        isActive={isActive}
                                                        onClick={handleTabChange}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <motion.button
                                            onClick={toggleTabsMinimized}
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 ml-1 flex-shrink-0"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            title="Minimize tabs"
                                        >
                                            <FiMinimize2 className="w-4 h-4" />
                                        </motion.button>
                                    </>
                                )}
                            </div>
                        </motion.div>

                        {/* Tab content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="min-w-0 w-full"
                            >
                                {renderTabContent()}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default StaffProfile;