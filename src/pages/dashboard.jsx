import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
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
  FiEye,
  FiEyeOff,
  FiArrowUpRight,
  FiAward,
  FiGrid,
  FiTrash2,
  FiCheck,
  FiMove,
  FiLayout,
  FiMoreVertical,
  FiLayers,
  FiStar,
  FiActivity,
  FiBriefcase,
  FiTarget,
  FiShoppingBag,
  FiUserPlus,
  FiCheckCircle,
  FiClock,
  FiMenu,
  FiChevronUp,
  FiChevronDown,
  FiHome,
  FiLock,
} from "react-icons/fi";
import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from "framer-motion";
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
import OmiFloatingBot from "../components/OmiFloatingBot";

// Version constants for localStorage migration
const DASHBOARD_VERSION = "5";
const QUICK_STATS_VERSION = "2";
const ADDITIONAL_STATS_VERSION = "2";

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
    visible: true,
    order: 3,
    icon: FiPieChart,
    category: "sales",
  },
  {
    id: "staff-wise-sales",
    title: "Staff Wise Sales",
    component: "StaffWiseSales",
    visible: true,
    order: 4,
    icon: FiUsers,
    category: "sales",
  },
  {
    id: "top-clients",
    title: "Top Clients",
    component: "TopClients",
    visible: true,
    order: 5,
    icon: FiAward,
    category: "clients",
  },
  {
    id: "additional-stats",
    title: "Additional Stats",
    component: "AdditionalStats",
    visible: true,
    order: 6,
    icon: FiGrid,
    category: "overview",
  },
];

const getDefaultQuickStatsCards = () => [
  {
    id: "pending-billing",
    title: "Pending Billing",
    value: "pending_for_billing",
    icon: FiShoppingBag,
    color: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    link: "/billing",
    isCurrency: false,
  },
  {
    id: "creditors",
    title: "Creditors",
    value: "creditor",
    icon: FiUsers,
    color: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    link: "/quick-stats/creditors",
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
    isCurrency: false,
  },
];

const getDefaultAdditionalStatsCards = () => [
  {
    id: "total-client",
    title: "Total Client",
    value: "total_client",
    icon: FiUsers,
    color: "bg-gradient-to-br from-gray-600 to-gray-700 text-white",
    gradient: "linear-gradient(135deg, #4b5563 0%, #374151 100%)",
    link: "/dashboard/clients/total_client",
    isCurrency: false,
  },
  {
    id: "new-client",
    title: "New Client",
    value: "new_client",
    icon: FiUserPlus,
    color: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    link: "/dashboard/clients/new_client",
    isCurrency: false,
  },
  {
    id: "active-client",
    title: "Active Client",
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
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
    title: "Task Create Today",
    value: "task_created_today",
    icon: FiPlus,
    color: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white",
    gradient: "linear-gradient(135deg, #667eea 0%, #3b82f6 100%)",
    link: "/dashboard/tasks/task_created_today",
    isCurrency: false,
  },
  {
    id: "task-complete-today",
    title: "Task Complete Today",
    value: "task_completed_today",
    icon: FiCheckCircle,
    color: "bg-gradient-to-br from-green-500 to-teal-600 text-white",
    gradient: "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
    link: "/dashboard/tasks/task_completed_today",
    isCurrency: false,
  },
];

const unlockBodyScroll = () => {
  document.body.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow");
};

const lockBodyScroll = () => {
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
};

const WIDGET_META = {
  "sales-overview": {
    description:
      "Annual sales total, growth trend, and achievement progress for the current financial year.",
    iconBg: "from-indigo-500 to-purple-600",
    ring: "ring-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
  },
  "quick-stats": {
    description:
      "At-a-glance counts for billing, creditors, debtors, payments, and today's birthdays.",
    iconBg: "from-sky-500 to-blue-600",
    ring: "ring-sky-100",
    badge: "bg-sky-100 text-sky-700",
  },
  "task-summary": {
    description:
      "Task pipeline breakdown — overdue, due today, in progress, and completed items.",
    iconBg: "from-amber-500 to-orange-600",
    ring: "ring-amber-100",
    badge: "bg-amber-100 text-amber-700",
  },
  "service-wise-sales": {
    description:
      "Sales distribution by service type with share percentages for the selected period.",
    iconBg: "from-violet-500 to-purple-600",
    ring: "ring-violet-100",
    badge: "bg-violet-100 text-violet-700",
  },
  "staff-wise-sales": {
    description:
      "Staff contribution to sales — compare performance across team members.",
    iconBg: "from-teal-500 to-emerald-600",
    ring: "ring-teal-100",
    badge: "bg-teal-100 text-teal-700",
  },
  "top-clients": {
    description:
      "Top clients ranked by sales volume with period filters and firm details.",
    iconBg: "from-rose-500 to-pink-600",
    ring: "ring-rose-100",
    badge: "bg-rose-100 text-rose-700",
  },
  "additional-stats": {
    description:
      "Extended metrics — client counts, task stats, and other operational KPIs.",
    iconBg: "from-cyan-500 to-blue-600",
    ring: "ring-cyan-100",
    badge: "bg-cyan-100 text-cyan-700",
  },
  "performance-metrics": {
    description:
      "Team productivity score and client satisfaction indicators over time.",
    iconBg: "from-fuchsia-500 to-purple-600",
    ring: "ring-fuchsia-100",
    badge: "bg-fuchsia-100 text-fuchsia-700",
  },
  "revenue-trend": {
    description:
      "Quarterly revenue growth chart with period-over-period comparison.",
    iconBg: "from-green-500 to-emerald-600",
    ring: "ring-green-100",
    badge: "bg-green-100 text-green-700",
  },
  "client-acquisition": {
    description:
      "New client intake vs retention — track acquisition goals and active base.",
    iconBg: "from-blue-500 to-cyan-600",
    ring: "ring-blue-100",
    badge: "bg-blue-100 text-blue-700",
  },
  "goal-progress": {
    description:
      "Monthly sales and client acquisition targets with completion percentage.",
    iconBg: "from-purple-500 to-violet-600",
    ring: "ring-purple-100",
    badge: "bg-purple-100 text-purple-700",
  },
};

const getWidgetMeta = (widget) =>
  WIDGET_META[widget.id] || {
    description: widget.description || "Custom dashboard widget.",
    iconBg: "from-gray-400 to-gray-500",
    ring: "ring-gray-100",
    badge: "bg-gray-100 text-gray-600",
  };

const SortableWidgetRow = React.memo(function SortableWidgetRow({
  widget,
  isHidden = false,
  sidebarWidgets,
  onToggleVisibility,
  onAddWidget,
  onDragEnd,
}) {
  const controls = useDragControls();
  const WidgetIcon = widget.icon || FiGrid;
  const meta = getWidgetMeta(widget);

  const rowContent = (
    <>
      {!isHidden && (
        <div
          className="pt-1 text-gray-300 hover:text-indigo-500 transition-colors cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => controls.start(e)}
        >
          <FiMove className="w-4 h-4" />
        </div>
      )}

      <div
        className={`p-2 rounded-lg bg-gradient-to-br ${meta.iconBg} shadow-sm flex-shrink-0`}
      >
        <WidgetIcon className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`font-medium text-sm truncate ${
              isHidden ? "text-gray-600" : "text-gray-800"
            }`}
          >
            {widget.title}
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${meta.badge}`}
          >
            {widget.category}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {meta.description}
        </p>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (isHidden) {
            if (sidebarWidgets.find((w) => w.id === widget.id)) {
              onToggleVisibility(widget.id);
            } else {
              onAddWidget(widget.id);
            }
          } else {
            onToggleVisibility(widget.id);
          }
        }}
        className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
          isHidden
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600"
        }`}
        title={isHidden ? "Show widget" : "Hide widget"}
      >
        {isHidden ? (
          <FiEye className="w-4 h-4" />
        ) : (
          <FiEyeOff className="w-4 h-4" />
        )}
      </motion.button>
    </>
  );

  if (isHidden) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -12, height: 0 }}
        animate={{ opacity: 1, x: 0, height: "auto" }}
        exit={{ opacity: 0, x: -12, height: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-gray-50/80 border-gray-100"
      >
        {rowContent}
      </motion.div>
    );
  }

  return (
    <Reorder.Item
      value={widget}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={`group flex items-start gap-2.5 p-2.5 rounded-xl border bg-white border-gray-200 hover:shadow-md ${meta.ring} hover:ring-2 list-none`}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 12px 28px rgba(99, 102, 241, 0.18)",
        zIndex: 50,
      }}
      transition={{ layout: { type: "spring", stiffness: 420, damping: 32 } }}
    >
      {rowContent}
    </Reorder.Item>
  );
});

const CustomizationSidebar = React.memo(function CustomizationSidebar({
  onReset,
  visibleWidgets,
  hiddenWidgets,
  sidebarWidgets,
  onCommitOrder,
  onToggleVisibility,
  onAddWidget,
}) {
  const [orderedItems, setOrderedItems] = useState(visibleWidgets);
  const orderedRef = useRef(visibleWidgets);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedItems(visibleWidgets);
      orderedRef.current = visibleWidgets;
    }
  }, [visibleWidgets]);

  const handleReorder = useCallback((newOrder) => {
    isDraggingRef.current = true;
    orderedRef.current = newOrder;
    setOrderedItems(newOrder);
  }, []);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    onCommitOrder(orderedRef.current);
  }, [onCommitOrder]);

  const stopScrollPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="h-full flex flex-col bg-white"
      onWheel={stopScrollPropagation}
      onTouchMove={stopScrollPropagation}
    >
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <FiLayout className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-sm leading-tight">
                Customize Dashboard
              </h3>
              <p className="text-indigo-100 text-[10px] leading-tight truncate">
                Drag to reorder · tap eye to show/hide
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="px-2 py-1 bg-white/15 hover:bg-white/25 text-white rounded-md transition-colors flex items-center gap-1 text-xs flex-shrink-0"
          >
            <FiRefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-4"
        onWheel={stopScrollPropagation}
        onTouchMove={stopScrollPropagation}
      >
        <div>
          <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-indigo-100">
              <FiGrid className="w-3 h-3 text-indigo-600" />
            </span>
            Active Widgets
            <span className="text-xs font-normal text-gray-400">
              ({orderedItems.length})
            </span>
          </h4>
          {orderedItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
              <FiGrid className="w-7 h-7 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium">No active widgets</p>
              <p className="text-xs text-gray-400 mt-1">
                Show widgets from the hidden section below
              </p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={orderedItems}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {orderedItems.map((widget) => (
                <SortableWidgetRow
                  key={widget.id}
                  widget={widget}
                  sidebarWidgets={sidebarWidgets}
                  onToggleVisibility={onToggleVisibility}
                  onAddWidget={onAddWidget}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </Reorder.Group>
          )}
        </div>

        <AnimatePresence initial={false}>
          {hiddenWidgets.length > 0 && (
            <motion.div
              key="hidden-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-gray-100">
                  <FiEyeOff className="w-3 h-3 text-gray-500" />
                </span>
                Hidden Widgets
                <span className="text-xs font-normal text-gray-400">
                  ({hiddenWidgets.length})
                </span>
              </h4>
              <div className="space-y-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {hiddenWidgets.map((widget) => (
                    <SortableWidgetRow
                      key={widget.id}
                      widget={widget}
                      isHidden
                      sidebarWidgets={sidebarWidgets}
                      onToggleVisibility={onToggleVisibility}
                      onAddWidget={onAddWidget}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

const Dashboard = () => {
  const navigate = useNavigate();
  const { openTaskCreate } = useTaskCreate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(false);
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [stats, setStats] = useState({});
  const [taskStats, setTaskStats] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Branch validation state — read localStorage synchronously to avoid welcome overlay flicker
  const [hasBranch, setHasBranch] = useState(hasValidBranchInStorage);
  const [branchValidated, setBranchValidated] = useState(
    hasValidBranchInStorage,
  );

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

  // Available widgets for adding
  const availableWidgets = useMemo(
    () => [
      {
        id: "performance-metrics",
        title: "Performance Metrics",
        component: "PerformanceMetrics",
        icon: FiActivity,
        category: "analytics",
        description: "Track team productivity and performance",
      },

      {
        id: "revenue-trend",
        title: "Revenue Trend",
        component: "RevenueTrend",
        icon: FiTrendingUp,
        category: "sales",
        description: "Monitor revenue growth and trends",
      },
      {
        id: "client-acquisition",
        title: "Client Acquisition",
        component: "ClientAcquisition",
        icon: FiBriefcase,
        category: "clients",
        description: "Track new and active clients",
      },
      {
        id: "goal-progress",
        title: "Goal Progress",
        component: "GoalProgress",
        icon: FiTarget,
        category: "overview",
        description: "Monitor business goals and targets",
      },
    ],
    [],
  );

  const handleBranchCreated = (branchData) => {
    setHasBranch(true);
    setBranchValidated(true);
    fetchDashboardData();
  };

  useEffect(() => {
    if (!branchValidated) {
      navigate("/branch-setup", { replace: true });
    }
  }, [branchValidated, navigate]);

  // Map widget ID to its corresponding permission check key
  const widgetPermissionMap = useMemo(
    () => ({
      "sales-overview": "sales_overview_view",
      "quick-stats": "quick_stats_view",
      "task-summary": "task_summary_view",
      "service-wise-sales": "service_wise_sales_view",
      "staff-wise-sales": "staff_wise_sales_view",
      "top-clients": "top_clients_view",
      "additional-stats": "dashboard_statistics_view",
      "performance-metrics": "dashboard_statistics_view",
      "revenue-trend": "sales_overview_view",
      "client-acquisition": "dashboard_statistics_view",
      "goal-progress": "dashboard_statistics_view",
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
    () => [
      ...widgets.filter(
        (w) =>
          !w.visible &&
          (widgetPermissionMap[w.id] ? check(widgetPermissionMap[w.id]) : true),
      ),
      ...availableWidgets.filter(
        (aw) =>
          !widgets.find((w) => w.id === aw.id) &&
          (widgetPermissionMap[aw.id]
            ? check(widgetPermissionMap[aw.id])
            : true),
      ),
    ],
    [widgets, availableWidgets, check, widgetPermissionMap],
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

  // Lock page scroll while customize panel or mobile menu is open
  useEffect(() => {
    if (isCustomizing || mobileMenuOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
    return () => {
      unlockBodyScroll();
    };
  }, [isCustomizing, mobileMenuOpen]);

  // Load initial data - Modified to check for branch
  useEffect(() => {
    if (branchValidated) {
      fetchDashboardData();
    }
  }, [branchValidated]);

  const fetchDashboardData = async () => {
    const branchId = localStorage.getItem("branch_id");
    if (!branchId) {
      console.log("No branch found, skipping data fetch");
      return;
    }

    setLoading(true);
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

        if (result.data.additional_metrics?.task_status_breakdown) {
          const taskBreakdown =
            result.data.additional_metrics.task_status_breakdown;
          const transformedTaskStats = [
            {
              name: "Task Status",
              OD: taskBreakdown["overdue"] || 0,
              DT: taskBreakdown["due_today"] || 0,
              D7: taskBreakdown["due_in_7_days"] || 0,
              FT: taskBreakdown["future_tasks"] || 0,
              WIP: taskBreakdown["in process"] || 0,
              PFC: taskBreakdown["pending_from_client"] || 0,
              PFD: taskBreakdown["pending from department"] || 0,
              CPL: taskBreakdown["complete"] || 0,
              CNL: taskBreakdown["cancelled"] || 0,
            },
          ];
          setTaskStats(transformedTaskStats);
        }

        if (result.data.top_clients) {
          setTopClients(result.data.top_clients);
        }
      } else {
        throw new Error(result.message || "Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Dashboard API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat("en-IN").format(number);
  };

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

  const addWidget = useCallback(
    (widgetId) => {
      const widgetToAdd = availableWidgets.find((w) => w.id === widgetId);
      if (widgetToAdd && !widgets.find((w) => w.id === widgetId)) {
        const visibleCount = widgets.filter((w) => w.visible).length;
        const newWidget = {
          ...widgetToAdd,
          visible: true,
          order: visibleCount,
        };
        setWidgets((prev) => [...prev, newWidget]);
      }
    },
    [widgets, availableWidgets],
  );

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
    unlockBodyScroll();
  }, []);

  // Widget Wrapper — static shell (no enter animation) to avoid flicker on parent re-renders
  const WidgetWrapper = React.memo(({ widgetId, children, className = "" }) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget || !widget.visible) return null;

    return (
      <div className={`relative ${className}`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {children}
        </div>
      </div>
    );
  });

  WidgetWrapper.displayName = "WidgetWrapper";

  // Quick Stats Widget
  const QuickStatsWidget = React.memo(() => (
    <WidgetWrapper widgetId="quick-stats">
      <div className="p-4">
        <QuickStats
          stats={stats}
          isCustomizing={false}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          blurEnabled={blurEnabled}
          onNavigate={(path, options) => {
            if (options?.state) {
              navigate(path, { state: options.state });
            } else {
              navigate(path);
            }
          }}
          quickStatsCards={quickStatsCards}
          setQuickStatsCards={setQuickStatsCards}
          onRefresh={fetchDashboardData}
        />
      </div>
    </WidgetWrapper>
  ));

  const TaskSummaryWidget = React.memo(() => (
    <WidgetWrapper widgetId="task-summary">
      <TaskSummary
        taskStats={taskStats}
        onRefresh={() => fetchDashboardData()}
        onCreateTask={() =>
          openTaskCreate({ onNavigateToTaskList: () => navigate("/task/view") })
        }
      />
    </WidgetWrapper>
  ));

  const ServiceWiseSalesWidget = React.memo(() => (
    <WidgetWrapper widgetId="service-wise-sales">
      <ServiceWiseSales
        onViewDetails={() => navigate("/sales/service-wise")}
        refreshTrigger={refreshKey}
      />
    </WidgetWrapper>
  ));

  const StaffWiseSalesWidget = React.memo(() => (
    <WidgetWrapper widgetId="staff-wise-sales">
      <StaffWiseSales
        onViewDetails={() => navigate("/sales/staff-wise")}
        refreshTrigger={refreshKey}
      />
    </WidgetWrapper>
  ));

  const TopClientsWidget = React.memo(() => (
    <WidgetWrapper widgetId="top-clients">
      <TopClients
        defaultDays={30}
        onViewDetails={() => navigate("/clients/top")}
        refreshTrigger={refreshKey}
      />
    </WidgetWrapper>
  ));

  const AdditionalStatsWidget = React.memo(() => (
    <WidgetWrapper widgetId="additional-stats">
      <AdditionalStatsComponent
        stats={stats}
        isCustomizing={false}
        formatCurrency={formatCurrency}
        formatNumber={formatNumber}
        blurEnabled={blurEnabled}
        onNavigate={(link) => navigate(link)}
        additionalStatsCards={additionalStatsCards}
        setAdditionalStatsCards={setAdditionalStatsCards}
      />
    </WidgetWrapper>
  ));

  const SalesOverviewWidgetComponent = React.memo(() => (
    <WidgetWrapper widgetId="sales-overview">
      <SalesOverviewWidget />
    </WidgetWrapper>
  ));

  const PerformanceMetricsWidget = React.memo(() => (
    <WidgetWrapper widgetId="performance-metrics">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
            <FiActivity className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">
            Performance Metrics
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-lg border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium text-sm">
                Productivity Score
              </span>
              <span className="text-lg font-bold text-indigo-600">87%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "87%" }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 text-xs text-gray-500">
              ↑ 12% from last month
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium text-sm">
                Client Satisfaction
              </span>
              <span className="text-lg font-bold text-green-600">92%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "92%" }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 text-xs text-gray-500">
              ↑ 8% from last month
            </div>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  ));

  const RevenueTrendWidget = React.memo(() => (
    <WidgetWrapper widgetId="revenue-trend">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
            <FiTrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">
            Revenue Trend
          </h3>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">+24.5%</div>
            <div className="text-sm font-medium text-gray-700 mb-1">
              Growth this quarter
            </div>
            <p className="text-xs text-gray-500">
              Compared to previous quarter
            </p>
          </div>
          <div className="mt-4 h-20 flex items-end justify-center gap-2">
            {[30, 50, 70, 90, 75, 85, 95].map((height, index) => (
              <motion.div
                key={index}
                className="w-6 bg-gradient-to-t from-green-400 to-emerald-500 rounded-t-lg"
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
            ))}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  ));

  const ClientAcquisitionWidget = React.memo(() => (
    <WidgetWrapper widgetId="client-acquisition">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
            <FiBriefcase className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">
            Client Acquisition
          </h3>
        </div>
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-600 mb-0.5">New Clients</div>
                <div className="text-lg font-bold text-blue-600">12</div>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiUserPlus className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full"
                style={{ width: "60%" }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Goal: 20 clients</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-3 rounded-lg border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-gray-600 mb-0.5">
                  Active Clients
                </div>
                <div className="text-lg font-bold text-emerald-600">389</div>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FiUsers className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-green-500 h-1.5 rounded-full"
                style={{ width: "85%" }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              ↑ 15% retention rate
            </div>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  ));

  const GoalProgressWidget = React.memo(() => (
    <WidgetWrapper widgetId="goal-progress">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg">
            <FiTarget className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">
            Goal Progress
          </h3>
        </div>
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-600 mb-0.5">
                  Monthly Sales Target
                </div>
                <div className="text-lg font-bold text-purple-600">75%</div>
              </div>
              <div className="text-xl">🎯</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "75%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              ₹9.4L / ₹12.5L target
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3 rounded-lg border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-gray-600 mb-0.5">
                  Client Acquisition
                </div>
                <div className="text-lg font-bold text-indigo-600">90%</div>
              </div>
              <div className="text-xl">🚀</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "90%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">18/20 new clients</div>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  ));

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

      {/* Main content - FULL WIDTH */}
      <div
        className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? "md:pl-20" : "md:pl-72"}`}
      >
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3">
          {hasAnyDashboardPermission && (
            <div className="flex justify-end mb-3">
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
              visibleWidgets.map((widget) => {
                switch (widget.component) {
                  case "SalesOverview":
                    return <SalesOverviewWidgetComponent key={widget.id} />;
                  case "QuickStats":
                    return <QuickStatsWidget key={widget.id} />;
                  case "TaskSummary":
                    return <TaskSummaryWidget key={widget.id} />;
                  case "ServiceWiseSales":
                    return <ServiceWiseSalesWidget key={widget.id} />;
                  case "StaffWiseSales":
                    return <StaffWiseSalesWidget key={widget.id} />;
                  case "TopClients":
                    return <TopClientsWidget key={widget.id} />;
                  case "AdditionalStats":
                    return <AdditionalStatsWidget key={widget.id} />;
                  case "PerformanceMetrics":
                    return <PerformanceMetricsWidget key={widget.id} />;
                  case "RevenueTrend":
                    return <RevenueTrendWidget key={widget.id} />;
                  case "ClientAcquisition":
                    return <ClientAcquisitionWidget key={widget.id} />;
                  case "GoalProgress":
                    return <GoalProgressWidget key={widget.id} />;
                  default:
                    return null;
                }
              })
            )}
          </div>
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {isCustomizing && (
            <>
              <motion.div
                key="customize-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: "none" }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/30 z-[9998] cursor-pointer"
                onMouseDown={closeCustomization}
                aria-hidden="true"
              />
              <motion.div
                key="customize-panel"
                initial={{ x: -380 }}
                animate={{ x: 0 }}
                exit={{ x: -380 }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
                className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-[9999] w-[380px] shadow-2xl border-r border-gray-200 overflow-hidden bg-white"
                onMouseDown={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <CustomizationSidebar
                  onReset={resetLayout}
                  visibleWidgets={visibleWidgets}
                  hiddenWidgets={hiddenWidgets}
                  sidebarWidgets={widgets}
                  onCommitOrder={commitVisibleWidgetOrder}
                  onToggleVisibility={toggleWidgetVisibility}
                  onAddWidget={addWidget}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <OmiFloatingBot />

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
