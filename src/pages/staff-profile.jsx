import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Sidebar, Header } from "../components/header";
import {
  FiUser,
  FiAward,
  FiBriefcase,
  FiTrendingUp,
  FiFileText,
  FiMail,
  FiPhone,
  FiRefreshCw,
  FiMaximize2,
  FiMinimize2,
  FiCheckSquare,
  FiX,
} from "react-icons/fi";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { useSubscription } from "../hooks/useSubscription";
import { resolveProfileImageUrl } from "../utils/user-profile-storage";
import ProfileTab from "../staff/ProfileTab";
import ExpenseTab from "../staff/ExpenseTab";
import BonusFineTab from "../staff/BonusFineTab";
import SalaryTab from "../staff/SalaryTab";
import LedgerTab from "../staff/LedgerTab";
import LoanTab from "../staff/LoanTab";
import PerformanceTab from "../staff/PerformanceTab";
import TaskTab from "../staff/StaffTaskTab";
import StaffPayslip from "../staff/StaffPayslip";

const InrIcon = ({ className = "w-4 h-4" }) => (
  <span
    className={`inline-flex items-center justify-center font-semibold leading-none ${className}`}
    aria-hidden
  >
    {"\u20B9"}
  </span>
);

const TabLink = ({ to, icon: Icon, label, isActive, onClick }) => {
  return (
    <motion.button
      onClick={() => onClick(to)}
      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200"
      }`}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        animate={{
          rotate: isActive ? [0, 5, 0] : 0,
          scale: isActive ? 1.1 : 1,
        }}
        transition={{ duration: 0.2 }}
        className="mb-1"
      >
        <Icon className="w-4 h-4" />
      </motion.div>
      <span className="text-xs font-medium text-center leading-tight">
        {label}
      </span>
    </motion.button>
  );
};

const CompactTabIcon = ({ to, icon: Icon, label, isActive, onClick }) => {
  return (
    <motion.button
      onClick={() => onClick(to)}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[70px] ${
        isActive
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200"
      }`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className="w-4 h-4 mb-1 mx-auto" />
      <span className="text-[10px] font-medium text-center leading-tight w-full">
        {label}
      </span>
    </motion.button>
  );
};

const SkeletonBone = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-200/90 ${className}`} />
);

const StaffProfilePageSkeleton = ({ tabsMinimized = true, tabCount = 9 }) => {
  const tabPlaceholders = Array.from({ length: tabCount }, (_, i) => i);

  return (
    <div aria-busy="true" aria-label="Loading staff profile">
      <section
        className="mb-4 px-3 py-2.5 sm:px-4 sm:py-3"
        style={{
          borderRadius: "1rem",
          background:
            "linear-gradient(145deg, #f8fafc 0%, #e8ecfe 38%, #f1edff 100%)",
          border: "1px solid rgba(199, 210, 254, 0.95)",
          boxShadow:
            "0 1px 3px rgba(49, 46, 129, 0.08), 0 0 0 1px rgba(30, 27, 75, 0.045)",
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBone className="h-10 w-10 shrink-0 rounded-full sm:h-11 sm:w-11" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBone className="h-2.5 w-14 rounded" />
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonBone className="h-5 w-40 rounded sm:w-52" />
                <SkeletonBone className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div
            className="flex w-full flex-col px-2 py-2 sm:w-auto sm:min-w-[6.5rem]"
            style={{
              borderRadius: "0.75rem",
              border: "1px solid rgba(255, 255, 255, 0.9)",
              backgroundColor: "rgba(255, 255, 255, 0.88)",
            }}
          >
            <SkeletonBone className="mx-auto h-5 w-24 rounded sm:ml-auto sm:mr-0" />
          </div>
        </div>

        <div
          className="mt-3 grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-4"
          style={{ borderTop: "1px solid rgba(199, 210, 254, 0.8)" }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={`sum-sk-${i}`}
              className="min-w-0 rounded-lg px-2.5 py-2"
              style={{
                background: "rgba(238, 242, 255, 0.72)",
                border: "1px solid rgba(199, 210, 254, 0.9)",
              }}
            >
              <SkeletonBone className="h-2.5 w-16 rounded" />
              <SkeletonBone className="mt-2 h-3.5 w-full max-w-[9rem] rounded" />
            </div>
          ))}
        </div>
      </section>

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-3">
          {tabsMinimized ? (
            <>
              <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
                {tabPlaceholders.map((i) => (
                  <div
                    key={`tab-compact-sk-${i}`}
                    className="flex min-w-[70px] flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-200 p-2"
                  >
                    <SkeletonBone className="h-4 w-4 rounded" />
                    <SkeletonBone className="h-2 w-10 rounded" />
                  </div>
                ))}
              </div>
              <SkeletonBone className="ml-1 h-8 w-8 shrink-0 rounded-lg" />
            </>
          ) : (
            <>
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {tabPlaceholders.map((i) => (
                  <div
                    key={`tab-grid-sk-${i}`}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-200 p-3"
                  >
                    <SkeletonBone className="h-4 w-4 rounded" />
                    <SkeletonBone className="h-2.5 w-14 rounded" />
                  </div>
                ))}
              </div>
              <SkeletonBone className="ml-1 h-8 w-8 shrink-0 rounded-lg" />
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <SkeletonBone className="h-4 w-32 rounded" />
          <SkeletonBone className="mt-2 h-3 w-48 rounded" />
        </div>
        <div className="space-y-3 p-3.5">
          {[0, 1].map((card) => (
            <div
              key={`content-card-sk-${card}`}
              className="rounded-xl border border-slate-200 bg-white p-3.5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SkeletonBone className="h-8 w-8 rounded-lg" />
                  <div className="space-y-1.5">
                    <SkeletonBone className="h-3.5 w-28 rounded" />
                    <SkeletonBone className="h-2.5 w-36 rounded" />
                  </div>
                </div>
                <SkeletonBone className="h-7 w-16 rounded-md" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Array.from({ length: card === 0 ? 8 : 6 }, (_, i) => (
                  <div
                    key={`field-sk-${card}-${i}`}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <SkeletonBone className="h-3 w-24 rounded" />
                    <SkeletonBone className="mt-2 h-3 w-full rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const STAFF_PROFILE_TABS = [
  "profile",
  "expense",
  "bonus-fine",
  "salary",
  "ledger",
  "loan",
  "performance",
  "task",
  "payslip",
];

const StaffProfile = () => {
  const navigate = useNavigate();
  const { username: usernameParam, tab } = useParams();
  const location = useLocation();
  const { hasAccess } = useSubscription();

  const username = usernameParam || null;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [tabsMinimized, setTabsMinimized] = useState(() => {
    const saved = localStorage.getItem("staffTabsMinimized");
    return saved ? JSON.parse(saved) : true;
  });
  const [activeTab, setActiveTab] = useState(
    STAFF_PROFILE_TABS.includes(tab) ? tab : "profile",
  );

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAccepted, setIsAccepted] = useState(false);

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
      line2: "",
    },
  });

  // Sample data for tabs
  const [expenses, setExpenses] = useState([]);
  const [bonusFine, setBonusFine] = useState([]);
  const [salary, setSalary] = useState({ list: [] });
  const [loan, setLoan] = useState({
    period: "",
    entries: [],
    openingBalance: "0.00",
    totalDebit: "0.00",
    totalCredit: "0.00",
    closingBalance: "0.00",
  });
  const [performance, setPerformance] = useState({
    period: "",
    services: [],
    tasks: [],
  });
  const [tasks, setTasks] = useState([]);

  // Legacy query URLs â†’ /staff/view/profile/{username}/{tab}
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryUsername = searchParams.get("username");
    if (!queryUsername) return;

    const legacyTab = STAFF_PROFILE_TABS.includes(usernameParam)
      ? usernameParam
      : tab || "profile";
    navigate(
      `/staff/view/profile/${encodeURIComponent(queryUsername)}/${legacyTab}`,
      { replace: true },
    );
  }, [location.search, usernameParam, tab, navigate]);

  // Missing / invalid username
  useEffect(() => {
    if (!usernameParam) {
      setError("No username provided");
      setLoading(false);
      return;
    }
    // Path segment is actually a tab from an old URL without query â€” wait for legacy redirect
    if (
      STAFF_PROFILE_TABS.includes(usernameParam) &&
      new URLSearchParams(location.search).get("username")
    ) {
      return;
    }
    setError(null);
    localStorage.setItem("selectedStaffUsername", usernameParam);
  }, [usernameParam, location.search]);

  // Update active tab when URL changes
  useEffect(() => {
    if (!tab) return;
    if (STAFF_PROFILE_TABS.includes(tab)) {
      setActiveTab(tab);
    } else if (username) {
      // Unknown/removed tab (e.g. legacy 'attendance' or 'entry-report' links) â€” fall back to profile
      setActiveTab("profile");
      navigate(`/staff/view/profile/${encodeURIComponent(username)}/profile`, {
        replace: true,
      });
    }
  }, [tab, username, navigate]);

  // Default tab when only username is in the path
  useEffect(() => {
    if (username && !tab && !STAFF_PROFILE_TABS.includes(username)) {
      navigate(`/staff/view/profile/${encodeURIComponent(username)}/profile`, {
        replace: true,
      });
    }
  }, [tab, navigate, username]);

  // Persist sidebar minimize state
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  // Persist tabs minimized state
  useEffect(() => {
    localStorage.setItem("staffTabsMinimized", JSON.stringify(tabsMinimized));
  }, [tabsMinimized]);

  // Fetch staff profile data when username is available
  useEffect(() => {
    if (username && !STAFF_PROFILE_TABS.includes(username)) {
      fetchStaffProfile();
    }
  }, [username]);

  // Function to fetch staff profile from API
  const fetchStaffProfile = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const headers = await getHeaders();
      if (!headers) {
        throw new Error("Authentication failed. Please login again.");
      }

      console.log(`Fetching staff profile for username: ${username}`);

      const response = await fetch(
        `${API_BASE_URL}/settings/staff/profile/${username}`,
        {
          method: "GET",
          headers: headers,
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Staff member not found");
        } else if (response.status === 401) {
          throw new Error("Unauthorized. Please login again.");
        } else if (response.status === 403) {
          throw new Error("You do not have permission to view this profile");
        } else {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }
      }

      const responseData = await response.json();
      console.log("Staff profile response:", responseData);

      if (
        responseData.success &&
        responseData.data &&
        responseData.data.length > 0
      ) {
        const staffMember = responseData.data[0];
        const isAcceptedStaff = staffMember.is_accepted === true;
        setIsAccepted(isAcceptedStaff);
        const branchInfo = staffMember.branch || {};

        const formattedPhone = staffMember.mobile
          ? `${staffMember.country_code ? "+" + staffMember.country_code : ""} ${staffMember.mobile}`.trim()
          : "";

        const transformedData = {
          firstName: staffMember.name?.split(" ")[0] || "",
          lastName: staffMember.name?.split(" ").slice(1).join(" ") || "",
          fullName: staffMember.name || "Unknown",
          email: staffMember.email || "",
          phone: formattedPhone,
          joinDate: staffMember.create_date
            ? formatDate(staffMember.create_date)
            : "",
          balance: "0.00",
          designation: staffMember.designation || "Not Assigned",
          dateOfBirth: staffMember.date_of_birth
            ? formatDate(staffMember.date_of_birth)
            : "",
          gender: staffMember.gender || "",
          username: staffMember.username || username,
          status: staffMember.status === true,
          userStatus: staffMember.user_status === true,
          is_accepted: staffMember.is_accepted === true,
          address: {
            state: staffMember.state || "",
            district: staffMember.district || "",
            city: staffMember.city || "",
            line1: staffMember.address_line_1 || "",
            line2: staffMember.address_line_2 || "",
            pincode: staffMember.pincode || "",
            country: staffMember.country || "",
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
              pincode: null,
            },
            tax_info: branchInfo.tax_info || {
              pan: "",
              gst: "",
            },
          },
          profile_id: staffMember.profile_id,
          care_of: staffMember.care_of,
          guardian_name: staffMember.guardian_name,
          country_code: staffMember.country_code,
          pan_number: staffMember.pan_number,
          village_town: staffMember.village_town,
          image: staffMember.image,
        };

        setStaffData(transformedData);
        console.log("Transformed staff data:", transformedData);

        if (!silent) {
          fetchExpensesData();
          fetchBonusFineData();
          fetchSalaryData();
          fetchLoanData();
          fetchPerformanceData();
          fetchTasksData();
        }
      } else {
        throw new Error("No staff data found");
      }
    } catch (err) {
      console.error("Error fetching staff profile:", err);
      setError(err.message || "Failed to load staff profile");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("en-GB");
    } catch (e) {
      return "";
    }
  };

  // API calls for other tabs
  const fetchExpensesData = async () => {
    setExpenses([]);
  };

  const fetchBonusFineData = async () => {
    setBonusFine([]);
  };

  const fetchSalaryData = async () => {
    setSalary({ list: [] });
  };

  const fetchLoanData = async () => {
    const today = new Date();
    const startDate = formatDate(today);
    const endDate = new Date(
      today.getFullYear() + 10,
      today.getMonth(),
      today.getDate(),
    );

    setLoan({
      period: `${startDate} - ${formatDate(endDate)}`,
      entries: [],
      openingBalance: "0.00",
      totalDebit: "0.00",
      totalCredit: "0.00",
      closingBalance: "0.00",
    });
  };

  const fetchPerformanceData = async () => {
    const today = new Date();
    const startDate = formatDate(today);
    const endDate = new Date(
      today.getFullYear() + 10,
      today.getMonth(),
      today.getDate(),
    );

    setPerformance({
      period: `${startDate} - ${formatDate(endDate)}`,
      services: [],
      tasks: generateTaskData(),
    });
  };

  const fetchTasksData = async () => {
    try {
      setTasks(generateTaskData());
    } catch (error) {
      console.error("Error fetching tasks:", error);
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
        status: "ASSIGNED",
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
        status: "IN_PROGRESS",
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
        status: "PENDING",
      },
    ];
  };

  const profileTabs = [
    { id: "profile", name: "Profile", icon: FiUser },
    { id: "expense", name: "Expense", icon: InrIcon },
    { id: "bonus-fine", name: "Bonus/Fine", icon: FiAward },
    {
      id: "salary",
      name: "Salary",
      icon: FiBriefcase,
      subscriptionFeature: "salary-management",
    },
    { id: "ledger", name: "Ledger", icon: InrIcon },
    { id: "loan", name: "Loan", icon: InrIcon },
    { id: "performance", name: "Performance", icon: FiTrendingUp },
    { id: "task", name: "Task", icon: FiCheckSquare },
    {
      id: "payslip",
      name: "Payslip",
      icon: FiFileText,
      subscriptionFeature: "salary-management",
    },
  ];

  const visibleTabs = useMemo(
    () =>
      profileTabs.filter(
        (tabItem) =>
          !tabItem.subscriptionFeature ||
          hasAccess(tabItem.subscriptionFeature),
      ),
    [hasAccess],
  );

  useEffect(() => {
    const currentTab = profileTabs.find((tabItem) => tabItem.id === activeTab);
    if (
      currentTab?.subscriptionFeature &&
      !hasAccess(currentTab.subscriptionFeature) &&
      username
    ) {
      setActiveTab("profile");
      navigate(`/staff/view/profile/${encodeURIComponent(username)}/profile`, {
        replace: true,
      });
    }
  }, [activeTab, hasAccess, username, navigate]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/staff/view/profile/${encodeURIComponent(username)}/${tabId}`);
  };

  const toggleTabsMinimized = () => {
    setTabsMinimized(!tabsMinimized);
  };

  const handleRefresh = () => {
    if (username) {
      fetchStaffProfile();
    }
  };

  const handleGoBack = () => {
    navigate("/staff/view");
  };

  const tabContentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  const renderTabContent = () => {
    const props = {
      variants: tabContentVariants,
      staffData,
      username,
      isAccepted,
    };

    switch (activeTab) {
      case "profile":
        return (
          <ProfileTab
            key="profile"
            staffData={staffData}
            setStaffData={setStaffData}
            username={username}
            {...props}
          />
        );
      case "expense":
        return (
          <ExpenseTab
            key="expense"
            expenses={expenses}
            setExpenses={setExpenses}
            username={username}
            staffUsername={username}
            {...props}
          />
        );
      case "bonus-fine":
        return (
          <BonusFineTab
            key="bonus-fine"
            bonusFine={bonusFine}
            setBonusFine={setBonusFine}
            username={username}
            staffName={staffData.fullName}
            {...props}
          />
        );
      case "salary":
        return (
          <SalaryTab
            key="salary"
            salary={salary}
            setSalary={setSalary}
            username={username}
            staffName={staffData.fullName}
            {...props}
          />
        );
      case "ledger":
        return (
          <LedgerTab
            key="ledger"
            username={username}
            staffData={staffData}
            staffName={staffData.fullName}
            staffEmail={staffData.email}
            staffMobile={staffData.phone}
            staffCountryCode={staffData.country_code || "91"}
            onProfileRefresh={() => {
              if (username) fetchStaffProfile({ silent: true });
            }}
          />
        );
      case "loan":
        return (
          <LoanTab
            key="loan"
            loan={loan}
            setLoan={setLoan}
            username={username}
            {...props}
          />
        );
      case "performance":
        return (
          <PerformanceTab
            key="performance"
            performance={performance}
            setPerformance={setPerformance}
            staffUsername={username}
            {...props}
          />
        );
      case "task":
        return (
          <TaskTab
            key="task"
            tasks={tasks}
            setTasks={setTasks}
            username={username}
            {...props}
          />
        );
      case "payslip":
        return (
          <StaffPayslip
            key="payslip"
            username={username}
            staffName={staffData.fullName}
            variants={tabContentVariants}
            {...props}
          />
        );
      default:
        return null;
    }
  };

  const balanceNum =
    Number(String(staffData.balance ?? 0).replace(/,/g, "")) || 0;
  const profileImageUrl = resolveProfileImageUrl(staffData.image);
  const isActiveStaff = Boolean(staffData.status ?? isAccepted);

  const formatBalance = (value) => {
    const n = Number(value) || 0;
    const abs = Math.abs(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return n < 0 ? `- \u20B9${abs}` : `\u20B9${abs}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
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

      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="w-full px-2 sm:px-4 md:px-8 py-4 md:py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {loading && (
              <StaffProfilePageSkeleton
                tabsMinimized={tabsMinimized}
                tabCount={visibleTabs.length || profileTabs.length}
              />
            )}

            {error && !loading && (
              <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                    <FiX className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Error Loading Profile
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{error}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && username && (
              <>
                <motion.section
                  className="mb-4 px-3 py-2.5 sm:px-4 sm:py-3"
                  style={{
                    borderRadius: "1rem",
                    background:
                      "linear-gradient(145deg, #f8fafc 0%, #e8ecfe 38%, #f1edff 100%)",
                    border: "1px solid rgba(199, 210, 254, 0.95)",
                    boxShadow:
                      "0 1px 3px rgba(49, 46, 129, 0.08), 0 0 0 1px rgba(30, 27, 75, 0.045)",
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  aria-label="Staff summary"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200/90 sm:h-11 sm:w-11">
                        {profileImageUrl ? (
                          <img
                            src={profileImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <FiUser className="h-[18px] w-[18px]" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Staff
                        </p>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <h1 className="min-w-0 max-w-full truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-lg">
                            {staffData.fullName || "â€”"}
                          </h1>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${
                              isActiveStaff
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-amber-200 bg-amber-50 text-amber-900"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActiveStaff
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                              }`}
                              aria-hidden
                            />
                            {isActiveStaff ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex w-full flex-col px-2 py-1.5 text-left sm:w-auto sm:min-w-[6.5rem] sm:text-right"
                      style={{
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(255, 255, 255, 0.9)",
                        backgroundColor: "rgba(255, 255, 255, 0.88)",
                        boxShadow: "0 1px 2px rgba(49, 46, 129, 0.07)",
                        backdropFilter: "blur(2px)",
                      }}
                      role="status"
                      aria-label="Account balance"
                    >
                      <div className="flex items-center justify-center gap-1.5 sm:justify-end">
                        <span
                          className={`mt-0.5 text-center text-sm font-semibold tabular-nums tracking-tight sm:text-base ${
                            balanceNum < 0
                              ? "text-rose-700"
                              : balanceNum > 0
                                ? "text-emerald-700"
                                : "text-slate-800"
                          }`}
                        >
                          {formatBalance(balanceNum)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <dl
                    className="mt-3 grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-4"
                    style={{ borderTop: "1px solid rgba(199, 210, 254, 0.8)" }}
                  >
                    <div
                      className="min-w-0 rounded-lg px-2.5 py-2"
                      style={{
                        background: "rgba(238, 242, 255, 0.72)",
                        border: "1px solid rgba(199, 210, 254, 0.9)",
                      }}
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Designation
                      </dt>
                      <dd className="mt-0.5 truncate text-xs font-medium text-slate-900 sm:text-[13px]">
                        {staffData.designation || "â€”"}
                      </dd>
                    </div>
                    <div
                      className="min-w-0 rounded-lg px-2.5 py-2"
                      style={{
                        background: "rgba(236, 254, 255, 0.72)",
                        border: "1px solid rgba(186, 230, 253, 0.9)",
                      }}
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Joined
                      </dt>
                      <dd className="mt-0.5 text-xs font-medium tabular-nums text-slate-900 sm:text-[13px]">
                        {staffData.joinDate || "â€”"}
                      </dd>
                    </div>
                    <div
                      className="min-w-0 rounded-lg px-2.5 py-2 sm:col-span-2 lg:col-span-1"
                      style={{
                        background: "rgba(241, 245, 249, 0.88)",
                        border: "1px solid rgba(203, 213, 225, 0.95)",
                      }}
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Phone
                      </dt>
                      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-900 sm:text-[13px]">
                        <FiPhone
                          className="h-3.5 w-3.5 shrink-0 text-slate-500"
                          aria-hidden
                        />
                        <span className="min-w-0 truncate">
                          {staffData.phone || "â€”"}
                        </span>
                      </dd>
                    </div>
                    <div
                      className="min-w-0 rounded-lg px-2.5 py-2 sm:col-span-2 lg:col-span-1"
                      style={{
                        background: "rgba(240, 249, 255, 0.8)",
                        border: "1px solid rgba(186, 230, 253, 0.9)",
                      }}
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </dt>
                      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-900 sm:text-[13px]">
                        <FiMail
                          className="h-3.5 w-3.5 shrink-0 text-slate-500"
                          aria-hidden
                        />
                        <span className="min-w-0 truncate">
                          {staffData.email || "â€”"}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </motion.section>

                <motion.div
                  className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between p-3">
                    {tabsMinimized ? (
                      <>
                        <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
                          {visibleTabs.map((tabItem) => {
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
                          type="button"
                          onClick={toggleTabsMinimized}
                          className="ml-1 flex-shrink-0 rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Show full tabs"
                        >
                          <FiMaximize2 className="h-4 w-4" />
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                          {visibleTabs.map((tabItem) => {
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
                          type="button"
                          onClick={toggleTabsMinimized}
                          className="ml-1 flex-shrink-0 rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Minimize tabs"
                        >
                          <FiMinimize2 className="h-4 w-4" />
                        </motion.button>
                      </>
                    )}
                  </div>
                </motion.div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full min-w-0 text-sm [&_h2]:text-lg"
                  >
                    {renderTabContent()}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
