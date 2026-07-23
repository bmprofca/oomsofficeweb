import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Sidebar, Header } from "../components/header";
import {
  FiTrendingUp,
  FiAlertCircle,
  FiTrendingDown,
  FiDownload,
  FiUsers,
  FiUserCheck,
  FiShoppingCart,
  FiCreditCard,
  FiDollarSign,
  FiCalendar,
  FiPieChart,
  FiBarChart2,
  FiPlus,
  FiRefreshCw,
  FiArrowUpRight,
  FiAward,
  FiGrid,
  FiTrash2,
  FiCheck,
  FiLayout,
  FiMoreVertical,
  FiLayers,
  FiStar,
  FiShoppingBag,
  FiUserPlus,
  FiCheckCircle,
  FiClock,
  FiMenu,
  FiChevronUp,
  FiChevronDown,
  FiHome,
  FiLock,
  FiBriefcase,
} from "react-icons/fi";
import { motion } from "framer-motion";
import TaskSummary from "../DashboardComponents/task-summary";
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import { useUserPermissions } from "../utils/permission-helper";
import AdditionalStatsComponent from "../DashboardComponents/additional-stats";
import QuickStats from "../DashboardComponents/quick-stats";
import ServiceWiseSales from "../DashboardComponents/serviceWiseSales";
import StaffWiseSales from "../DashboardComponents/staffWiseSales";
import TopClients from "../DashboardComponents/TopClients";
import { useNavigate } from "react-router-dom";
import { useTaskCreate } from "../context/TaskCreateProvider";
import SalesOverviewWidget from "../DashboardComponents/SalesOverviewWidget";
import DashboardCustomizeDrawer from "../DashboardComponents/DashboardCustomizeDrawer";
// Version constants for localStorage migration
const DASHBOARD_VERSION = "7";
const QUICK_STATS_VERSION = "3";
const ADDITIONAL_STATS_VERSION = "3";

const hasValidBranchInStorage = () => {
  const branchId = localStorage.getItem("branch_id");
  return !!(
    branchId &&
    branchId !== "null" &&
    branchId !== "undefined" &&
    branchId !== ""
  );
};

// Helper function to migrate old quick stats links
const migrateQuickStatsLinks = (cards) => {
  const linkMap = {
    "/view-billing": "/billing",
    "/view-creditors": "/quick-stats/creditors",
    "/view-debtors": "/quick-stats/debtors",
    "/view-received": "/quick-stats/today-received",
    "/view-payments": "/quick-stats/today-payment",
    "/view-birthday-today": "/quick-stats/today-birthday",
  };

  return cards.map((card) => ({
    ...card,
    link: linkMap[card.link] || card.link,
  }));
};

// Default configurations
const getDefaultWidgets = () => [
  {
    id: "sales-overview",
    title: "Sales Overview",
    component: "SalesOverview",
    visible: true,
    order: 0,
    icon: FiTrendingUp,
    category: "sales",
  },
  {
    id: "quick-stats",
    title: "Quick Stats",
    component: "QuickStats",
    visible: true,
    order: 1,
    icon: FiBarChart2,
    category: "overview",
  },
  {
    id: "task-summary",
    title: "Task Summary",
    component: "TaskSummary",
    visible: true,
    order: 2,
    icon: FiCalendar,
    category: "tasks",
  },
  {
    id: "service-wise-sales",
    title: "Service Wise Sales",
    component: "ServiceWiseSales",
    visible: false,
    order: 3,
    icon: FiPieChart,
    category: "sales",
  },
  {
    id: "staff-wise-sales",
    title: "Staff Wise Sales",
    component: "StaffWiseSales",
    visible: false,
    order: 4,
    icon: FiUsers,
    category: "sales",
  },
  {
    id: "top-clients",
    title: "Top Clients",
    component: "TopClients",
    visible: false,
    order: 5,
    icon: FiAward,
    category: "clients",
  },
  {
    id: "additional-stats",
    title: "Additional Stats",
    component: "AdditionalStats",
    visible: false,
    order: 6,
    icon: FiGrid,
    category: "overview",
  },
];

const getDefaultQuickStatsCards = () => [
  {
    id: "pending-billing",
    title: "Pending Billing",
    value: "pending_billing",
    icon: FiShoppingBag,
    color: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    link: "/billing",
    showCount: true,
    showAmount: true,
    isCurrency: true,
  },
  {
    id: "creditors",
    title: "Creditors",
    value: "creditor",
    icon: FiUsers,
    color: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    link: "/quick-stats/creditors",
    showCount: true,
    showAmount: true,
    isCurrency: true,
  },
  {
    id: "debtors",
    title: "Debtors",
    value: "debtor",
    icon: FiShoppingCart,
    color: "bg-gradient-to-br from-red-500 to-pink-600 text-white",
    gradient: "linear-gradient(135deg, #ef4444 0%, #ec4899 100%)",
    link: "/quick-stats/debtors",
    showCount: true,
    showAmount: true,
    isCurrency: true,
  },
  {
    id: "today-received",
    title: "Today Received",
    value: "today_received",
    icon: FiDollarSign,
    color: "bg-gradient-to-br from-green-500 to-emerald-600 text-white",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    link: "/quick-stats/today-received",
    showCount: true,
    showAmount: true,
    isCurrency: true,
  },
  {
    id: "today-payment",
    title: "Today Payment",
    value: "today_payment",
    icon: FiCreditCard,
    color: "bg-gradient-to-br from-orange-500 to-amber-600 text-white",
    gradient: "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)",
    link: "/quick-stats/today-payment",
    showCount: true,
    showAmount: true,
    isCurrency: true,
  },
  {
    id: "today-birthday",
    title: "Today Birthday",
    value: "today_birthday",
    icon: FiCalendar,
    color: "bg-gradient-to-br from-purple-500 to-violet-600 text-white",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    link: "/quick-stats/today-birthday",
    showCount: true,
    showAmount: false,
    isCurrency: false,
  },
];

const getDefaultAdditionalStatsCards = () => [
  {
    id: "total-client",
    title: "Total Clients",
    value: "total_client",
    icon: FiUsers,
    color: "bg-gradient-to-br from-gray-600 to-gray-700 text-white",
    gradient: "linear-gradient(135deg, #4b5563 0%, #374151 100%)",
    link: "/dashboard/clients/total_client",
    isCurrency: false,
  },
  {
    id: "new-client",
    title: "New Clients",
    value: "new_client",
    icon: FiUserPlus,
    color: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    link: "/dashboard/clients/new_client",
    isCurrency: false,
  },
  {
    id: "active-client",
    title: "Active Clients",
    value: "active_client",
    icon: FiCheckCircle,
    color: "bg-gradient-to-br from-green-500 to-emerald-600 text-white",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    link: "/dashboard/clients/active_client",
    isCurrency: false,
  },
  {
    id: "net-profit",
    title: "Net Profit",
    value: "net_profit",
    icon: FiTrendingUp,
    color: "bg-gradient-to-br from-emerald-500 to-green-600 text-white",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    link: "/finance/report",
    isCurrency: true,
  },
  {
    id: "total-staff",
    title: "Total Staff",
    value: "total_staff",
    icon: FiUsers,
    color: "bg-gradient-to-br from-red-500 to-rose-600 text-white",
    gradient: "linear-gradient(135deg, #ef4444 0%, #e11d48 100%)",
    link: "/staff/view",
    isCurrency: false,
  },
  {
    id: "present-today",
    title: "Present Today",
    value: "present_today",
    icon: FiUserCheck,
    color: "bg-gradient-to-br from-blue-500 to-cyan-600 text-white",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    link: "/staff/attendance",
    isCurrency: false,
  },
  {
    id: "task-create-today",
    title: "Tasks Created",
    value: "task_created_today",
    icon: FiPlus,
    color: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    link: "/dashboard/tasks/task_created_today",
    isCurrency: false,
  },
  {
    id: "task-complete-today",
    title: "Tasks Completed",
    value: "task_completed_today",
    icon: FiCheckCircle,
    color: "bg-gradient-to-br from-green-500 to-teal-600 text-white",
    gradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
    link: "/dashboard/tasks/task_completed_today",
    isCurrency: false,
  },
  {
    id: "total-ca",
    title: "Total CA",
    value: "total_ca",
    icon: FiBriefcase,
    color: "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    link: "/staff/office-assistance/ca-list",
    isCurrency: false,
  },
  {
    id: "total-agent",
    title: "Total Agent",
    value: "total_agent",
    icon: FiUserPlus,
    color: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
    link: "/settings/agent-list",
    isCurrency: false,
  },
  {
    id: "total-firms",
    title: "Total Firms",
    value: "total_firms",
    icon: FiHome,
    color: "bg-gradient-to-br from-orange-500 to-amber-600 text-white",
    gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
    link: "/staff/office-assistance/group-firms",
    isCurrency: false,
  },
  {
    id: "total-services",
    title: "Total Services",
    value: "total_services",
    icon: FiLayers,
    color: "bg-gradient-to-br from-purple-500 to-violet-600 text-white",
    gradient: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
    link: "/staff/office-assistance/services",
    isCurrency: false,
  },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (number) =>
  new Intl.NumberFormat("en-IN").format(number);

/** Stable shell — must live outside Dashboard so sidebar/drawer state does not remount widgets. */
const WidgetWrapper = React.memo(
  ({ visible, children, className = "", variant = "default" }) => {
    if (!visible) return null;

    const shellClassName =
      variant === "flush"
        ? "rounded-xl shadow-sm overflow-hidden"
        : "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden";

    return (
      <div className={`relative ${className}`}>
        <div className={shellClassName}>{children}</div>
      </div>
    );
  },
);

WidgetWrapper.displayName = "WidgetWrapper";

const Dashboard = () => {
  const navigate = useNavigate();
  const { openTaskCreate } = useTaskCreate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [blurEnabled] = useState(false);
  const [stats, setStats] = useState({});
  const [branchValidated] = useState(hasValidBranchInStorage);

  // Customization state
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Dashboard Widgets with version control and migration
  const [widgets, setWidgets] = useState(() => {
    const savedVersion = localStorage.getItem("dashboardVersion");
    const savedLayout = localStorage.getItem("dashboardLayout");

    if (!savedLayout || savedVersion !== DASHBOARD_VERSION) {
      const defaultLayout = getDefaultWidgets();
      localStorage.setItem("dashboardLayout", JSON.stringify(defaultLayout));
      localStorage.setItem("dashboardVersion", DASHBOARD_VERSION);
      return defaultLayout;
    }

    const parsedLayout = JSON.parse(savedLayout).filter(
      (item) => item.id !== "recurring-task-summary",
    );
    const defaultLayout = getDefaultWidgets();
    const missingWidgets = defaultLayout.filter(
      (def) => !parsedLayout.some((item) => item.id === def.id),
    );
    if (missingWidgets.length > 0) {
      let maxOrder = parsedLayout.reduce(
        (max, item) => Math.max(max, item.order ?? 0),
        -1,
      );
      const mergedLayout = [
        ...parsedLayout,
        ...missingWidgets.map((widget) => ({ ...widget, order: ++maxOrder })),
      ];
      localStorage.setItem("dashboardLayout", JSON.stringify(mergedLayout));
      localStorage.setItem("dashboardVersion", DASHBOARD_VERSION);
      return mergedLayout;
    }

    return parsedLayout;
  });

  // Quick Stats Cards with version control and migration
  const [quickStatsCards, setQuickStatsCards] = useState(() => {
    const savedVersion = localStorage.getItem("quickStatsVersion");
    const savedCards = localStorage.getItem("quickStatsCards");

    if (!savedCards || savedVersion !== QUICK_STATS_VERSION) {
      const defaultCards = getDefaultQuickStatsCards();
      localStorage.setItem("quickStatsCards", JSON.stringify(defaultCards));
      localStorage.setItem("quickStatsVersion", QUICK_STATS_VERSION);
      return defaultCards;
    }

    const cards = JSON.parse(savedCards);

    const needsMigration = cards.some(
      (card) =>
        card.link === "/view-billing" ||
        card.link === "/view-creditors" ||
        card.link === "/view-debtors" ||
        card.link === "/view-received" ||
        card.link === "/view-payments" ||
        card.link === "/view-birthday-today",
    );

    let finalCards = cards;
    if (needsMigration) {
      finalCards = migrateQuickStatsLinks(cards);
    }

    const defaultCards = getDefaultQuickStatsCards();
    const missingCards = defaultCards.filter(
      (def) => !finalCards.some((c) => c.id === def.id),
    );
    if (missingCards.length > 0) {
      finalCards = [...finalCards, ...missingCards];
      localStorage.setItem("quickStatsCards", JSON.stringify(finalCards));
      localStorage.setItem("quickStatsVersion", QUICK_STATS_VERSION);
    } else if (needsMigration) {
      localStorage.setItem("quickStatsCards", JSON.stringify(finalCards));
      localStorage.setItem("quickStatsVersion", QUICK_STATS_VERSION);
    }

    return finalCards;
  });

  // Additional Stats Cards with version control and migration
  const [additionalStatsCards, setAdditionalStatsCards] = useState(() => {
    const savedVersion = localStorage.getItem("additionalStatsVersion");
    const savedCards = localStorage.getItem("additionalStatsCards");

    if (!savedCards || savedVersion !== ADDITIONAL_STATS_VERSION) {
      const defaultCards = getDefaultAdditionalStatsCards();
      localStorage.setItem(
        "additionalStatsCards",
        JSON.stringify(defaultCards),
      );
      localStorage.setItem("additionalStatsVersion", ADDITIONAL_STATS_VERSION);
      return defaultCards;
    }

    const cards = JSON.parse(savedCards);
    const defaultCards = getDefaultAdditionalStatsCards();
    const missingCards = defaultCards.filter(
      (def) => !cards.some((c) => c.id === def.id),
    );
    if (missingCards.length > 0) {
      const finalCards = [...cards, ...missingCards];
      localStorage.setItem("additionalStatsCards", JSON.stringify(finalCards));
      localStorage.setItem("additionalStatsVersion", ADDITIONAL_STATS_VERSION);
      return finalCards;
    }

    return cards;
  });

  useEffect(() => {
    if (!branchValidated) {
      navigate("/branch-setup", { replace: true });
    }
  }, [branchValidated, navigate]);

  const widgetPermissionMap = useMemo(
    () => ({
      "sales-overview": "sales_overview_view",
      "quick-stats": "quick_stats_view",
      "task-summary": "task_summary_view",
      "service-wise-sales": "service_wise_sales_view",
      "staff-wise-sales": "staff_wise_sales_view",
      "top-clients": "top_clients_view",
      "additional-stats": "dashboard_statistics_view",
    }),
    [],
  );

  const hasAnyDashboardPermission = useMemo(() => {
    return Object.values(widgetPermissionMap).some((perm) => check(perm));
  }, [check, widgetPermissionMap]);

  const filterWidgetsByPermission = useCallback(
    (widgetList) =>
      widgetList
        .filter((w) => {
          if (!w.visible) return false;
          const perm = widgetPermissionMap[w.id];
          return perm ? check(perm) : true;
        })
        .sort((a, b) => a.order - b.order),
    [check, widgetPermissionMap],
  );

  const visibleWidgets = useMemo(
    () => filterWidgetsByPermission(widgets),
    [widgets, filterWidgetsByPermission],
  );

  const hiddenWidgets = useMemo(
    () =>
      widgets.filter(
        (w) =>
          !w.visible &&
          (widgetPermissionMap[w.id] ? check(widgetPermissionMap[w.id]) : true),
      ),
    [widgets, check, widgetPermissionMap],
  );

  // Persist sidebar minimized state
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  // Persist layout to localStorage (realtime)
  useEffect(() => {
    localStorage.setItem("dashboardLayout", JSON.stringify(widgets));
    localStorage.setItem("dashboardVersion", DASHBOARD_VERSION);
    localStorage.setItem("quickStatsCards", JSON.stringify(quickStatsCards));
    localStorage.setItem("quickStatsVersion", QUICK_STATS_VERSION);
    localStorage.setItem(
      "additionalStatsCards",
      JSON.stringify(additionalStatsCards),
    );
    localStorage.setItem("additionalStatsVersion", ADDITIONAL_STATS_VERSION);
  }, [widgets, quickStatsCards, additionalStatsCards]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  // Load initial shared dashboard stats once (branch validated)
  const fetchDashboardData = useCallback(async () => {
    const branchId = localStorage.getItem("branch_id");
    if (!branchId) {
      console.log("No branch found, skipping data fetch");
      return;
    }

    try {
      const headers = getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/report/dashboard-summary?branch_id=${branchId}`,
        {
          method: "GET",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Dashboard API Error:", err);
    }
  }, []);

  useEffect(() => {
    if (branchValidated) {
      fetchDashboardData();
    }
  }, [branchValidated, fetchDashboardData]);

  const commitVisibleWidgetOrder = useCallback((orderedVisible) => {
    setWidgets((prev) => {
      const hidden = prev.filter((w) => !w.visible);
      const byId = new Map(prev.map((w) => [w.id, w]));
      return [
        ...orderedVisible.map((w, idx) => ({
          ...(byId.get(w.id) || w),
          order: idx,
        })),
        ...hidden.map((w, idx) => ({
          ...w,
          order: orderedVisible.length + idx,
        })),
      ];
    });
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item,
      ),
    );
  }, []);

  const startCustomization = useCallback(() => {
    setIsCustomizing(true);
  }, []);

  const resetLayout = useCallback(() => {
    setWidgets(getDefaultWidgets());
    setQuickStatsCards(getDefaultQuickStatsCards());
    setAdditionalStatsCards(getDefaultAdditionalStatsCards());
  }, []);

  const closeCustomization = useCallback(() => {
    setIsCustomizing(false);
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }, []);

  const handleCreateTask = useCallback(() => {
    openTaskCreate({ onNavigateToTaskList: () => navigate("/task/view") });
  }, [navigate, openTaskCreate]);

  const handleQuickStatsNavigate = useCallback(
    (path, options) => {
      if (options?.state) {
        navigate(path, { state: options.state });
      } else {
        navigate(path);
      }
    },
    [navigate],
  );

  const widgetVisibility = useMemo(() => {
    const map = {};
    widgets.forEach((w) => {
      map[w.id] = !!w.visible;
    });
    return map;
  }, [widgets]);

  const renderWidget = useCallback(
    (widget) => {
      switch (widget.component) {
        case "SalesOverview":
          return (
            <WidgetWrapper
              key={widget.id}
              visible={widgetVisibility["sales-overview"]}
              variant="flush"
            >
              <SalesOverviewWidget />
            </WidgetWrapper>
          );
        case "QuickStats":
          return (
            <WidgetWrapper
              key={widget.id}
              visible={widgetVisibility["quick-stats"]}
            >
              <div className="p-4">
                <QuickStats
                  stats={stats}
                  isCustomizing={false}
                  formatCurrency={formatCurrency}
                  formatNumber={formatNumber}
                  blurEnabled={blurEnabled}
                  onNavigate={handleQuickStatsNavigate}
                  quickStatsCards={quickStatsCards}
                  setQuickStatsCards={setQuickStatsCards}
                />
              </div>
            </WidgetWrapper>
          );
        case "TaskSummary":
          return (
            <WidgetWrapper
              key={widget.id}
              visible={widgetVisibility["task-summary"]}
              className="min-w-0"
            >
              <TaskSummary onCreateTask={handleCreateTask} />
            </WidgetWrapper>
          );
        case "ServiceWiseSales":
          return (
            <WidgetWrapper
              key={widget.id}
              visible={widgetVisibility["service-wise-sales"]}
            >
              <ServiceWiseSales
                onViewDetails={() => navigate("/sales/service-wise")}
              />
            </WidgetWrapper>
          );
        case "StaffWiseSales":
          return (
            <WidgetWrapper
              key={widget.id}
              visible={widgetVisibility["staff-wise-sales"]}
            >
              <StaffWiseSales
                onViewDetails={() => navigate("/sales/staff-wise")}
              />
            </WidgetWrapper>
          );
        case "TopClients":
          return (
            <WidgetWrapper
              key={widget.id}
              visible={widgetVisibility["top-clients"]}
            >
              <TopClients />
            </WidgetWrapper>
          );
        case "AdditionalStats":
          return (
            <WidgetWrapper
              key={widget.id}
              visible={widgetVisibility["additional-stats"]}
            >
              <AdditionalStatsComponent
                isCustomizing={false}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                blurEnabled={blurEnabled}
                onNavigate={(link) => navigate(link)}
                additionalStatsCards={additionalStatsCards}
                setAdditionalStatsCards={setAdditionalStatsCards}
              />
            </WidgetWrapper>
          );
        default:
          return null;
      }
    },
    [
      additionalStatsCards,
      blurEnabled,
      handleCreateTask,
      handleQuickStatsNavigate,
      navigate,
      quickStatsCards,
      stats,
      widgetVisibility,
    ],
  );

  if (!branchValidated) {
    return null;
  }

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

      {/* Main content - FULL WIDTH (match task-display sidebar inset) */}
      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          {hasAnyDashboardPermission && (
            <div className="flex items-center justify-between gap-3 mb-3">
              <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight">
                Dashboard
              </h1>
              <motion.button
                onClick={() =>
                  isCustomizing ? closeCustomization() : startCustomization()
                }
                className={`p-2 rounded-lg shadow-sm transition-all duration-200 border ${
                  isCustomizing
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={
                  isCustomizing ? "Cancel customization" : "Customize dashboard"
                }
              >
                <FiLayout className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* Dashboard Widgets Grid */}
          <div className="space-y-3">
            {!hasAnyDashboardPermission ? (
              <motion.div
                className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 p-12 shadow-xl text-center max-w-xl mx-auto my-12"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="inline-flex p-4 bg-red-50 rounded-full mb-4 text-red-500 animate-float">
                  <FiLock className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Access Denied
                </h3>
                <p className="text-gray-600 mb-6">
                  No Permission. You need permission to access the Dashboard.
                </p>
                <div className="text-xs text-gray-400 bg-gray-50 py-2 px-4 rounded-lg inline-block font-mono">
                  Please contact your administrator to request access.
                </div>
              </motion.div>
            ) : visibleWidgets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-white/50 backdrop-blur-sm rounded-xl border border-dashed border-gray-200">
                No widgets visible. Use the customize button at the top right to
                customize your dashboard layout.
              </div>
            ) : (
              visibleWidgets.map((widget) => renderWidget(widget))
            )}
          </div>
        </div>
      </div>

      <DashboardCustomizeDrawer
        isOpen={isCustomizing}
        onClose={closeCustomization}
        onReset={resetLayout}
        visibleWidgets={visibleWidgets}
        hiddenWidgets={hiddenWidgets}
        onCommitOrder={commitVisibleWidgetOrder}
        onToggleVisibility={toggleWidgetVisibility}
      />

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
