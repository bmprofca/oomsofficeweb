import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar, Header } from '../components/header';
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
    FiSave,
    FiTrash2,
    FiX,
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
    FiMinimize2,
    FiMaximize2,
    FiArrowUp,
    FiArrowDown,
    FiHome
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import TaskSummary from '../DashboardComponents/task-summary';
import RecurringTaskSummary from '../DashboardComponents/recurring-task-summary';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import AdditionalStatsComponent from '../DashboardComponents/additional-stats';
import QuickStats from '../DashboardComponents/quick-stats';
import ServiceWiseSales from '../DashboardComponents/serviceWiseSales';
import StaffWiseSales from '../DashboardComponents/staffWiseSales';
import TopClients from '../DashboardComponents/TopClients';
import { useNavigate } from 'react-router-dom';
import SalesOverviewWidget from '../DashboardComponents/SalesOverviewWidget';
import BranchSetupModal from '../../src/DashboardComponents/BranchSetupModal';
import OmiFloatingBot from '../components/OmiFloatingBot';

// Version constants for localStorage migration
const DASHBOARD_VERSION = '4';
const QUICK_STATS_VERSION = '2';
const ADDITIONAL_STATS_VERSION = '2';

// Helper function to migrate old quick stats links
const migrateQuickStatsLinks = (cards) => {
    const linkMap = {
        '/view-billing': '/billing',
        '/view-creditors': '/quick-stats/creditors',
        '/view-debtors': '/quick-stats/debtors',
        '/view-received': '/quick-stats/today-received',
        '/view-payments': '/quick-stats/today-payment',
        '/view-birthday-today': '/quick-stats/today-birthday'
    };

    return cards.map(card => ({
        ...card,
        link: linkMap[card.link] || card.link
    }));
};

// Default configurations
const getDefaultWidgets = () => [
    {
        id: 'sales-overview',
        title: 'Sales Overview',
        component: 'SalesOverview',
        visible: true,
        order: 0,
        icon: FiTrendingUp,
        category: 'sales'
    },
    {
        id: 'quick-stats',
        title: 'Quick Stats',
        component: 'QuickStats',
        visible: true,
        order: 1,
        icon: FiBarChart2,
        category: 'overview'
    },
    {
        id: 'task-summary',
        title: 'Task Summary',
        component: 'TaskSummary',
        visible: true,
        order: 2,
        icon: FiCalendar,
        category: 'tasks'
    },
    {
        id: 'recurring-task-summary',
        title: 'Recurring Task Summary',
        component: 'RecurringTaskSummary',
        visible: true,
        order: 3,
        icon: FiLayers,
        category: 'tasks'
    },
    {
        id: 'service-wise-sales',
        title: 'Service Wise Sales',
        component: 'ServiceWiseSales',
        visible: true,
        order: 4,
        icon: FiPieChart,
        category: 'sales'
    },
    {
        id: 'staff-wise-sales',
        title: 'Staff Wise Sales',
        component: 'StaffWiseSales',
        visible: true,
        order: 5,
        icon: FiUsers,
        category: 'sales'
    },
    {
        id: 'top-clients',
        title: 'Top Clients',
        component: 'TopClients',
        visible: true,
        order: 6,
        icon: FiAward,
        category: 'clients'
    },
    {
        id: 'additional-stats',
        title: 'Additional Stats',
        component: 'AdditionalStats',
        visible: true,
        order: 7,
        icon: FiGrid,
        category: 'overview'
    }
];

const getDefaultQuickStatsCards = () => [
    {
        id: 'pending-billing',
        title: 'Pending Billing',
        value: 'pending_for_billing',
        icon: FiShoppingBag,
        color: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        link: '/billing',
        isCurrency: false
    },
    {
        id: 'creditors',
        title: 'Creditors',
        value: 'creditor',
        icon: FiUsers,
        color: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        link: '/quick-stats/creditors',
        isCurrency: true
    },
    {
        id: 'debtors',
        title: 'Debtors',
        value: 'debtor',
        icon: FiShoppingCart,
        color: 'bg-gradient-to-br from-red-500 to-pink-600 text-white',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
        link: '/quick-stats/debtors',
        isCurrency: true
    },
    {
        id: 'today-received',
        title: 'Today Received',
        value: 'today_received',
        icon: FiDollarSign,
        color: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        link: '/quick-stats/today-received',
        isCurrency: true
    },
    {
        id: 'today-payment',
        title: 'Today Payment',
        value: 'today_payment',
        icon: FiCreditCard,
        color: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white',
        gradient: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
        link: '/quick-stats/today-payment',
        isCurrency: true
    },
    {
        id: 'today-birthday',
        title: 'Today Birthday',
        value: 'today_birthday',
        icon: FiCalendar,
        color: 'bg-gradient-to-br from-purple-500 to-violet-600 text-white',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        link: '/quick-stats/today-birthday',
        isCurrency: false
    }
];

const getDefaultAdditionalStatsCards = () => [
    {
        id: 'total-client',
        title: 'Total Client',
        value: 'total_client',
        icon: FiUsers,
        color: 'bg-gradient-to-br from-gray-600 to-gray-700 text-white',
        gradient: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
        link: '/dashboard/clients/total_client',
        isCurrency: false
    },
    {
        id: 'new-client',
        title: 'New Client',
        value: 'new_client',
        icon: FiUserPlus,
        color: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        link: '/dashboard/clients/new_client',
        isCurrency: false
    },
    {
        id: 'active-client',
        title: 'Active Client',
        value: 'active_client',
        icon: FiCheckCircle,
        color: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        link: '/dashboard/clients/active_client',
        isCurrency: false
    },
    {
        id: 'net-profit',
        title: 'Net Profit',
        value: 'net_profit',
        icon: FiTrendingUp,
        color: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        link: '/finance/report',
        isCurrency: true
    },
    {
        id: 'total-staff',
        title: 'Total Staff',
        value: 'total_staff',
        icon: FiUsers,
        color: 'bg-gradient-to-br from-red-500 to-rose-600 text-white',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #e11d48 100%)',
        link: '/staff/view',
        isCurrency: false
    },
    {
        id: 'present-today',
        title: 'Present Today',
        value: 'present_today',
        icon: FiUserCheck,
        color: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
        link: '/staff/attendance',
        isCurrency: false
    },
    {
        id: 'task-create-today',
        title: 'Task Create Today',
        value: 'task_created_today',
        icon: FiPlus,
        color: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white',
        gradient: 'linear-gradient(135deg, #667eea 0%, #3b82f6 100%)',
        link: '/dashboard/tasks/task_created_today',
        isCurrency: false
    },
    {
        id: 'task-complete-today',
        title: 'Task Complete Today',
        value: 'task_completed_today',
        icon: FiCheckCircle,
        color: 'bg-gradient-to-br from-green-500 to-teal-600 text-white',
        gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
        link: '/dashboard/tasks/task_completed_today',
        isCurrency: false
    }
];

const Dashboard = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [blurEnabled, setBlurEnabled] = useState(false);
    const [stats, setStats] = useState({});
    const [taskStats, setTaskStats] = useState([]);
    const [topClients, setTopClients] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Branch validation state
    const [hasBranch, setHasBranch] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branchValidated, setBranchValidated] = useState(false);

    // Customization state
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [customizationPanelMinimized, setCustomizationPanelMinimized] = useState(false);

    // Working copy for customization (only updated on save)
    const [workingWidgets, setWorkingWidgets] = useState(null);
    const [workingQuickStatsCards, setWorkingQuickStatsCards] = useState(null);
    const [workingAdditionalStatsCards, setWorkingAdditionalStatsCards] = useState(null);

    // Dashboard Widgets with version control and migration
    const [widgets, setWidgets] = useState(() => {
        const savedVersion = localStorage.getItem('dashboardVersion');
        const savedLayout = localStorage.getItem('dashboardLayout');

        if (!savedLayout || savedVersion !== DASHBOARD_VERSION) {
            const defaultLayout = getDefaultWidgets();
            localStorage.setItem('dashboardLayout', JSON.stringify(defaultLayout));
            localStorage.setItem('dashboardVersion', DASHBOARD_VERSION);
            return defaultLayout;
        }

        const parsedLayout = JSON.parse(savedLayout);
        const defaultLayout = getDefaultWidgets();
        const missingWidgets = defaultLayout.filter(def => !parsedLayout.some(item => item.id === def.id));
        if (missingWidgets.length > 0) {
            let maxOrder = parsedLayout.reduce((max, item) => Math.max(max, item.order ?? 0), -1);
            const mergedLayout = [
                ...parsedLayout,
                ...missingWidgets.map(widget => ({ ...widget, order: ++maxOrder }))
            ];
            localStorage.setItem('dashboardLayout', JSON.stringify(mergedLayout));
            localStorage.setItem('dashboardVersion', DASHBOARD_VERSION);
            return mergedLayout;
        }

        return parsedLayout;
    });

    // Quick Stats Cards with version control and migration
    const [quickStatsCards, setQuickStatsCards] = useState(() => {
        const savedVersion = localStorage.getItem('quickStatsVersion');
        const savedCards = localStorage.getItem('quickStatsCards');

        if (!savedCards || savedVersion !== QUICK_STATS_VERSION) {
            const defaultCards = getDefaultQuickStatsCards();
            localStorage.setItem('quickStatsCards', JSON.stringify(defaultCards));
            localStorage.setItem('quickStatsVersion', QUICK_STATS_VERSION);
            return defaultCards;
        }

        const cards = JSON.parse(savedCards);

        const needsMigration = cards.some(card =>
            card.link === '/view-billing' ||
            card.link === '/view-creditors' ||
            card.link === '/view-debtors' ||
            card.link === '/view-received' ||
            card.link === '/view-payments' ||
            card.link === '/view-birthday-today'
        );

        let finalCards = cards;
        if (needsMigration) {
            finalCards = migrateQuickStatsLinks(cards);
        }

        const defaultCards = getDefaultQuickStatsCards();
        const missingCards = defaultCards.filter(def => !finalCards.some(c => c.id === def.id));
        if (missingCards.length > 0) {
            finalCards = [...finalCards, ...missingCards];
            localStorage.setItem('quickStatsCards', JSON.stringify(finalCards));
            localStorage.setItem('quickStatsVersion', QUICK_STATS_VERSION);
        } else if (needsMigration) {
            localStorage.setItem('quickStatsCards', JSON.stringify(finalCards));
            localStorage.setItem('quickStatsVersion', QUICK_STATS_VERSION);
        }

        return finalCards;
    });

    // Additional Stats Cards with version control and migration
    const [additionalStatsCards, setAdditionalStatsCards] = useState(() => {
        const savedVersion = localStorage.getItem('additionalStatsVersion');
        const savedCards = localStorage.getItem('additionalStatsCards');

        if (!savedCards || savedVersion !== ADDITIONAL_STATS_VERSION) {
            const defaultCards = getDefaultAdditionalStatsCards();
            localStorage.setItem('additionalStatsCards', JSON.stringify(defaultCards));
            localStorage.setItem('additionalStatsVersion', ADDITIONAL_STATS_VERSION);
            return defaultCards;
        }

        const cards = JSON.parse(savedCards);
        const defaultCards = getDefaultAdditionalStatsCards();
        const missingCards = defaultCards.filter(def => !cards.some(c => c.id === def.id));
        if (missingCards.length > 0) {
            const finalCards = [...cards, ...missingCards];
            localStorage.setItem('additionalStatsCards', JSON.stringify(finalCards));
            localStorage.setItem('additionalStatsVersion', ADDITIONAL_STATS_VERSION);
            return finalCards;
        }

        return cards;
    });

    // Available widgets for adding
    const availableWidgets = useMemo(() => [
        {
            id: 'performance-metrics',
            title: 'Performance Metrics',
            component: 'PerformanceMetrics',
            icon: FiActivity,
            category: 'analytics',
            description: 'Track team productivity and performance'
        },
        {
            id: 'recurring-task-summary',
            title: 'Recurring Task Summary',
            component: 'RecurringTaskSummary',
            icon: FiLayers,
            category: 'tasks',
            description: 'Overview of recurring compliance schedules'
        },
        {
            id: 'revenue-trend',
            title: 'Revenue Trend',
            component: 'RevenueTrend',
            icon: FiTrendingUp,
            category: 'sales',
            description: 'Monitor revenue growth and trends'
        },
        {
            id: 'client-acquisition',
            title: 'Client Acquisition',
            component: 'ClientAcquisition',
            icon: FiBriefcase,
            category: 'clients',
            description: 'Track new and active clients'
        },
        {
            id: 'goal-progress',
            title: 'Goal Progress',
            component: 'GoalProgress',
            icon: FiTarget,
            category: 'overview',
            description: 'Monitor business goals and targets'
        }
    ], []);

    // Check for branch_id in localStorage on mount
    useEffect(() => {
        const branchId = localStorage.getItem('branch_id');
        if (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') {
            setHasBranch(true);
            setBranchValidated(true);
        } else {
            setHasBranch(false);
            setBranchValidated(false);
            // Don't auto-open modal - wait for button click
        }
    }, []);

    const handleBranchCreated = (branchData) => {
        setHasBranch(true);
        setBranchValidated(true);
        setShowBranchModal(false);
        // Refresh dashboard data with new branch
        fetchDashboardData();
    };

    const handleCloseBranchModal = () => {
        setShowBranchModal(false);
    };

    const openBranchModal = () => {
        setShowBranchModal(true);
    };

    // Initialize working copies when entering customization mode
    useEffect(() => {
        if (isCustomizing && !workingWidgets) {
            setWorkingWidgets(JSON.parse(JSON.stringify(widgets)));
            setWorkingQuickStatsCards(JSON.parse(JSON.stringify(quickStatsCards)));
            setWorkingAdditionalStatsCards(JSON.parse(JSON.stringify(additionalStatsCards)));
        }
    }, [isCustomizing, widgets, quickStatsCards, additionalStatsCards, workingWidgets]);

    // Use working copies or original based on customization mode
    const displayWidgets = isCustomizing && workingWidgets ? workingWidgets : widgets;
    const displayQuickStatsCards = isCustomizing && workingQuickStatsCards ? workingQuickStatsCards : quickStatsCards;
    const displayAdditionalStatsCards = isCustomizing && workingAdditionalStatsCards ? workingAdditionalStatsCards : additionalStatsCards;

    // Memoized visible and hidden widgets for performance
    const visibleWidgets = useMemo(() =>
        displayWidgets.filter(w => w.visible).sort((a, b) => a.order - b.order),
        [displayWidgets]
    );

    const hiddenWidgets = useMemo(() => [
        ...displayWidgets.filter(w => !w.visible),
        ...availableWidgets.filter(aw => !displayWidgets.find(w => w.id === aw.id))
    ], [displayWidgets, availableWidgets]);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Save layout to localStorage only when not customizing
    useEffect(() => {
        if (!isCustomizing) {
            localStorage.setItem('dashboardLayout', JSON.stringify(widgets));
            localStorage.setItem('dashboardVersion', DASHBOARD_VERSION);
            localStorage.setItem('quickStatsCards', JSON.stringify(quickStatsCards));
            localStorage.setItem('quickStatsVersion', QUICK_STATS_VERSION);
            localStorage.setItem('additionalStatsCards', JSON.stringify(additionalStatsCards));
            localStorage.setItem('additionalStatsVersion', ADDITIONAL_STATS_VERSION);
        }
    }, [widgets, quickStatsCards, additionalStatsCards, isCustomizing]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Load initial data - Modified to check for branch
    useEffect(() => {
        if (branchValidated) {
            fetchDashboardData();
        }
    }, [branchValidated]);

    const fetchDashboardData = async () => {
        const branchId = localStorage.getItem('branch_id');
        if (!branchId) {
            console.log('No branch found, skipping data fetch');
            return;
        }

        setLoading(true);
        try {
            const headers = getHeaders();
            const response = await fetch(`${API_BASE_URL}/report/dashboard-summary?branch_id=${branchId}`, {
                method: 'GET',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                setStats(result.data);

                if (result.data.additional_metrics?.task_status_breakdown) {
                    const taskBreakdown = result.data.additional_metrics.task_status_breakdown;
                    const transformedTaskStats = [
                        {
                            name: 'Task Status',
                            OD: taskBreakdown['overdue'] || 0,
                            DT: taskBreakdown['due_today'] || 0,
                            D7: taskBreakdown['due_in_7_days'] || 0,
                            FT: taskBreakdown['future_tasks'] || 0,
                            WIP: taskBreakdown['in process'] || 0,
                            PFC: taskBreakdown['pending_from_client'] || 0,
                            PFD: taskBreakdown['pending from department'] || 0,
                            CPL: taskBreakdown['complete'] || 0,
                            CNL: taskBreakdown['cancelled'] || 0
                        }
                    ];
                    setTaskStats(transformedTaskStats);
                }

                if (result.data.top_clients) {
                    setTopClients(result.data.top_clients);
                }
            } else {
                throw new Error(result.message || 'Failed to fetch dashboard data');
            }
        } catch (err) {
            console.error('Dashboard API Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatNumber = (number) => {
        return new Intl.NumberFormat('en-IN').format(number);
    };

    // Arrow-based movement - only updates working copy (sidebar only)
    const moveWidgetUp = useCallback((index) => {
        if (!isCustomizing || index === 0) return;

        setWorkingWidgets(prevWidgets => {
            if (!prevWidgets) return prevWidgets;
            const newWidgets = [...prevWidgets];
            const visibleWidgetsList = newWidgets.filter(w => w.visible);
            const hiddenWidgetsList = newWidgets.filter(w => !w.visible);

            // Swap positions
            [visibleWidgetsList[index], visibleWidgetsList[index - 1]] =
                [visibleWidgetsList[index - 1], visibleWidgetsList[index]];

            // Update orders
            return [
                ...visibleWidgetsList.map((w, idx) => ({ ...w, order: idx })),
                ...hiddenWidgetsList.map((w, idx) => ({ ...w, order: visibleWidgetsList.length + idx }))
            ];
        });
    }, [isCustomizing]);

    const moveWidgetDown = useCallback((index) => {
        if (!isCustomizing || index === visibleWidgets.length - 1) return;

        setWorkingWidgets(prevWidgets => {
            if (!prevWidgets) return prevWidgets;
            const newWidgets = [...prevWidgets];
            const visibleWidgetsList = newWidgets.filter(w => w.visible);
            const hiddenWidgetsList = newWidgets.filter(w => !w.visible);

            // Swap positions
            [visibleWidgetsList[index], visibleWidgetsList[index + 1]] =
                [visibleWidgetsList[index + 1], visibleWidgetsList[index]];

            // Update orders
            return [
                ...visibleWidgetsList.map((w, idx) => ({ ...w, order: idx })),
                ...hiddenWidgetsList.map((w, idx) => ({ ...w, order: visibleWidgetsList.length + idx }))
            ];
        });
    }, [isCustomizing, visibleWidgets.length]);

    // Widget management functions (only on working copy)
    const toggleWidgetVisibility = useCallback((widgetId) => {
        if (!isCustomizing) return;
        setWorkingWidgets(items =>
            items.map(item =>
                item.id === widgetId
                    ? { ...item, visible: !item.visible }
                    : item
            )
        );
    }, [isCustomizing]);

    const addWidget = useCallback((widgetId) => {
        if (!isCustomizing) return;

        const widgetToAdd = availableWidgets.find(w => w.id === widgetId);
        if (widgetToAdd && !displayWidgets.find(w => w.id === widgetId)) {
            const visibleCount = displayWidgets.filter(w => w.visible).length;
            const newWidget = {
                ...widgetToAdd,
                visible: true,
                order: visibleCount
            };
            setWorkingWidgets(prev => [...prev, newWidget]);
        }
    }, [isCustomizing, displayWidgets, availableWidgets]);

    const resetLayout = useCallback(() => {
        if (!isCustomizing) return;
        const defaultLayout = getDefaultWidgets();
        const defaultQuickStats = getDefaultQuickStatsCards();
        const defaultAdditionalStats = getDefaultAdditionalStatsCards();

        setWorkingWidgets(defaultLayout);
        setWorkingQuickStatsCards(defaultQuickStats);
        setWorkingAdditionalStatsCards(defaultAdditionalStats);
    }, [isCustomizing]);

    const saveLayout = useCallback(() => {
        if (workingWidgets) {
            // Apply changes to main state - ONLY ONE RE-RENDER HERE
            setWidgets(workingWidgets);
            setQuickStatsCards(workingQuickStatsCards || quickStatsCards);
            setAdditionalStatsCards(workingAdditionalStatsCards || additionalStatsCards);
        }
        setIsCustomizing(false);
        setCustomizationPanelMinimized(false);
        setWorkingWidgets(null);
        setWorkingQuickStatsCards(null);
        setWorkingAdditionalStatsCards(null);
    }, [workingWidgets, workingQuickStatsCards, workingAdditionalStatsCards, quickStatsCards, additionalStatsCards]);

    const cancelCustomization = useCallback(() => {
        setIsCustomizing(false);
        setCustomizationPanelMinimized(false);
        setWorkingWidgets(null);
        setWorkingQuickStatsCards(null);
        setWorkingAdditionalStatsCards(null);
    }, []);

    // Widget Wrapper Component
    const WidgetWrapper = React.memo(({ widgetId, title, children, className = '' }) => {
        const widget = displayWidgets.find(w => w.id === widgetId);
        if (!widget || !widget.visible) return null;

        return (
            <div className={`relative ${className}`}>
                <motion.div
                    className="bg-white rounded-2xl shadow-xl overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {children}
                </motion.div>
            </div>
        );
    });

    WidgetWrapper.displayName = 'WidgetWrapper';

    // Customization Sidebar Component - NO DRAG AND DROP, ONLY ARROWS
    const CustomizationSidebar = () => {
        return (
            <motion.div
                initial={{ x: -400, opacity: 0 }}
                animate={{
                    x: customizationPanelMinimized ? -380 : 0,
                    opacity: 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 bg-white shadow-2xl border-r border-gray-200"
                style={{ width: '380px' }}
            >
                {/* Minimize/Expand Toggle */}
                <button
                    onClick={() => setCustomizationPanelMinimized(!customizationPanelMinimized)}
                    className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all duration-300 z-50"
                >
                    {customizationPanelMinimized ? (
                        <FiMaximize2 className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                        <FiMinimize2 className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-semibold text-base">Customize Dashboard</h3>
                            <p className="text-indigo-200 text-xs mt-0.5">Use arrows to reorder widgets</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={resetLayout}
                                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-300 flex items-center gap-1.5 text-xs"
                            >
                                <FiRefreshCw className="w-3.5 h-3.5" />
                                Reset
                            </button>
                            <button
                                onClick={saveLayout}
                                className="px-3 py-1.5 bg-white text-indigo-600 hover:bg-gray-50 rounded-lg transition-all duration-300 flex items-center gap-1.5 text-xs font-medium"
                            >
                                <FiSave className="w-3.5 h-3.5" />
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="h-[calc(100%-73px)] overflow-y-auto p-4 space-y-5">
                    {/* Active Widgets Section */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-800 mb-2.5 flex items-center gap-1.5">
                            <FiGrid className="w-3.5 h-3.5 text-indigo-600" />
                            Active Widgets
                            <span className="text-xs font-normal text-gray-500 ml-1">({visibleWidgets.length})</span>
                        </h4>
                        <div className="space-y-2">
                            {visibleWidgets.map((widget, index) => {
                                const WidgetIcon = widget.icon || FiGrid;
                                return (
                                    <div
                                        key={widget.id}
                                        className="group flex items-center gap-2 p-2.5 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                                    >
                                        {/* Icon */}
                                        <div className="p-1.5 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                                            <WidgetIcon className="w-3.5 h-3.5 text-indigo-600" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-800 text-sm truncate">{widget.title}</div>
                                            <div className="text-xs text-gray-500 capitalize">{widget.category}</div>
                                        </div>

                                        {/* Arrow Controls */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => moveWidgetUp(index)}
                                                disabled={index === 0}
                                                className={`p-1 rounded transition-all duration-200 ${index === 0
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                                                    }`}
                                                title="Move up"
                                            >
                                                <FiArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => moveWidgetDown(index)}
                                                disabled={index === visibleWidgets.length - 1}
                                                className={`p-1 rounded transition-all duration-200 ${index === visibleWidgets.length - 1
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                                                    }`}
                                                title="Move down"
                                            >
                                                <FiArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Hide Button */}
                                        <button
                                            onClick={() => toggleWidgetVisibility(widget.id)}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                            title="Hide widget"
                                        >
                                            <FiEyeOff className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                            {visibleWidgets.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <FiGrid className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No active widgets</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hidden Widgets Section */}
                    {hiddenWidgets.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-gray-800 mb-2.5 flex items-center gap-1.5">
                                <FiEyeOff className="w-3.5 h-3.5 text-gray-500" />
                                Hidden Widgets
                                <span className="text-xs font-normal text-gray-500 ml-1">({hiddenWidgets.length})</span>
                            </h4>
                            <div className="space-y-2">
                                {hiddenWidgets.map((widget) => {
                                    const WidgetIcon = widget.icon || FiGrid;
                                    return (
                                        <div
                                            key={widget.id}
                                            className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 opacity-75 hover:opacity-100 transition-all duration-200"
                                        >
                                            <div className="p-1.5 bg-gray-200 rounded-lg">
                                                <WidgetIcon className="w-3.5 h-3.5 text-gray-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-600 text-sm truncate">{widget.title}</div>
                                                {widget.description && (
                                                    <div className="text-xs text-gray-400 truncate">{widget.description}</div>
                                                )}
                                                <div className="text-xs text-gray-400 capitalize mt-0.5">{widget.category}</div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (displayWidgets.find(w => w.id === widget.id)) {
                                                        toggleWidgetVisibility(widget.id);
                                                    } else {
                                                        addWidget(widget.id);
                                                    }
                                                }}
                                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200"
                                                title="Show widget"
                                            >
                                                <FiEye className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-50 border-t border-gray-200">
                    <div className="text-xs text-gray-500 text-center">
                        💡 Tip: Use arrow buttons ↑ ↓ to reorder widgets
                    </div>
                </div>
            </motion.div>
        );
    };

    // Quick Stats Widget
    const QuickStatsWidget = React.memo(() => (
        <WidgetWrapper widgetId="quick-stats" title="Quick Stats">
            <div className="p-6">
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
                    quickStatsCards={displayQuickStatsCards}
                    setQuickStatsCards={isCustomizing ? setWorkingQuickStatsCards : setQuickStatsCards}
                    onRefresh={fetchDashboardData}
                />
            </div>
        </WidgetWrapper>
    ));

    const TaskSummaryWidget = React.memo(() => (
        <WidgetWrapper widgetId="task-summary" title="Task Summary">
            <TaskSummary
                taskStats={taskStats}
                onRefresh={() => fetchDashboardData()}
                onCreateTask={() => navigate('/task/create')}
            />
        </WidgetWrapper>
    ));

    const RecurringTaskSummaryWidget = React.memo(() => (
        <WidgetWrapper widgetId="recurring-task-summary" title="Recurring Task Summary">
            <RecurringTaskSummary
                onRefresh={() => fetchDashboardData()}
            />
        </WidgetWrapper>
    ));

    const ServiceWiseSalesWidget = React.memo(() => (
        <WidgetWrapper widgetId="service-wise-sales" title="Service Wise Sales">
            <ServiceWiseSales
                onViewDetails={() => navigate('/sales/service-wise')}
                refreshTrigger={refreshKey}
            />
        </WidgetWrapper>
    ));

    const StaffWiseSalesWidget = React.memo(() => (
        <WidgetWrapper widgetId="staff-wise-sales" title="Staff Wise Sales">
            <StaffWiseSales
                onViewDetails={() => navigate('/sales/staff-wise')}
                refreshTrigger={refreshKey}
            />
        </WidgetWrapper>
    ));

    const TopClientsWidget = React.memo(() => (
        <WidgetWrapper widgetId="top-clients" title="Top Clients">
            <TopClients
                defaultDays={30}
                onViewDetails={() => navigate('/clients/top')}
                refreshTrigger={refreshKey}
            />
        </WidgetWrapper>
    ));

    const AdditionalStatsWidget = React.memo(() => (
        <WidgetWrapper widgetId="additional-stats" title="Additional Stats">
            <AdditionalStatsComponent
                stats={stats}
                isCustomizing={false}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                blurEnabled={blurEnabled}
                onNavigate={(link) => navigate(link)}
                additionalStatsCards={displayAdditionalStatsCards}
                setAdditionalStatsCards={isCustomizing ? setWorkingAdditionalStatsCards : setAdditionalStatsCards}
            />
        </WidgetWrapper>
    ));

    const SalesOverviewWidgetComponent = React.memo(() => (
        <WidgetWrapper widgetId="sales-overview" title="Sales Overview">
            <SalesOverviewWidget />
        </WidgetWrapper>
    ));

    const PerformanceMetricsWidget = React.memo(() => (
        <WidgetWrapper widgetId="performance-metrics" title="Performance Metrics">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                        <FiActivity className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Performance Metrics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-gray-600 font-medium text-sm">Productivity Score</span>
                            <span className="text-xl font-bold text-indigo-600">87%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '87%' }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <div className="mt-3 text-xs text-gray-500">↑ 12% from last month</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-gray-600 font-medium text-sm">Client Satisfaction</span>
                            <span className="text-xl font-bold text-green-600">92%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '92%' }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <div className="mt-3 text-xs text-gray-500">↑ 8% from last month</div>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    ));

    const RevenueTrendWidget = React.memo(() => (
        <WidgetWrapper widgetId="revenue-trend" title="Revenue Trend">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                        <FiTrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Revenue Trend</h3>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">+24.5%</div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Growth this quarter</div>
                        <p className="text-xs text-gray-500">Compared to previous quarter</p>
                    </div>
                    <div className="mt-6 h-24 flex items-end justify-center gap-3">
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
        <WidgetWrapper widgetId="client-acquisition" title="Client Acquisition">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                        <FiBriefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Client Acquisition</h3>
                </div>
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-xs text-gray-600 mb-0.5">New Clients</div>
                                <div className="text-xl font-bold text-blue-600">12</div>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FiUserPlus className="w-4 h-4 text-blue-600" />
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">Goal: 20 clients</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-xs text-gray-600 mb-0.5">Active Clients</div>
                                <div className="text-xl font-bold text-emerald-600">389</div>
                            </div>
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <FiUsers className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">↑ 15% retention rate</div>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    ));

    const GoalProgressWidget = React.memo(() => (
        <WidgetWrapper widgetId="goal-progress" title="Goal Progress">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl">
                        <FiTarget className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Goal Progress</h3>
                </div>
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-100">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-xs text-gray-600 mb-0.5">Monthly Sales Target</div>
                                <div className="text-xl font-bold text-purple-600">75%</div>
                            </div>
                            <div className="text-xl">🎯</div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                                className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '75%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </div>
                        <div className="mt-2 text-xs text-gray-500">₹9.4L / ₹12.5L target</div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-xs text-gray-600 mb-0.5">Client Acquisition</div>
                                <div className="text-xl font-bold text-indigo-600">90%</div>
                            </div>
                            <div className="text-xl">🚀</div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '90%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </div>
                        <div className="mt-2 text-xs text-gray-500">18/20 new clients</div>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    ));

    // If branch is not validated, show greyed out overlay with Setup button
    if (!branchValidated) {
        return (
            <>
                <div className="min-h-screen bg-gray-100 relative">
                    {/* Greyed out Header */}
                    <div className="bg-white shadow-sm border-b border-gray-200 p-4 opacity-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-200 rounded-lg">
                                    <FiActivity className="w-6 h-6 text-gray-400" />
                                </div>
                                <div>
                                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                                    <div className="h-3 w-48 bg-gray-200 rounded mt-1"></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Greyed out Sidebar */}
                    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg opacity-50">
                        <div className="p-4 space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-10 bg-gray-200 rounded-lg"></div>
                            ))}
                        </div>
                    </div>

                    {/* Greyed out Content */}
                    <div className="ml-64 pt-16 p-6">
                        <div className="space-y-4">
                            <div className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
                                <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
                                <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* Setup Button Overlay */}
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="text-center bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl"
                        >
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FiHome className="w-12 h-12 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome to Your Dashboard</h2>
                            <p className="text-gray-600 mb-6">
                                You haven't set up your branch yet. Click the button below to create your first branch and start using the system.
                            </p>
                            <motion.button
                                onClick={openBranchModal}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 flex items-center gap-2 mx-auto"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FiHome className="w-5 h-5" />
                                Setup Your Branch
                            </motion.button>
                        </motion.div>
                    </div>
                </div>

                {/* Branch Setup Modal */}
                <BranchSetupModal
                    isOpen={showBranchModal}
                    onBranchCreated={handleBranchCreated}
                    onClose={handleCloseBranchModal}
                />
            </>
        );
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
            <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header with alert and 3-dot button in same row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                        {/* Subscription Alert */}
                        <div className="flex-1">
                            <motion.div
                                className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 shadow-lg"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-red-100 to-rose-100 rounded-lg">
                                        <FiAward className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-red-800 text-sm">
                                            ALERT: Your subscription will expire in 7 days.
                                        </div>
                                        <div className="text-red-600 text-xs">
                                            Renew your subscription to continue uninterrupted service
                                        </div>
                                    </div>
                                    <motion.button
                                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:shadow-xl transition-all duration-300 text-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Renew Now
                                    </motion.button>
                                </div>
                            </motion.div>
                        </div>

                        {/* Customize Button */}
                        <div className="flex items-center justify-center">
                            <motion.button
                                onClick={() => setIsCustomizing(!isCustomizing)}
                                className={`p-2.5 rounded-lg shadow-lg transition-all duration-300 border ${isCustomizing
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                                    }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FiLayout className="w-4 h-4" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Dashboard Widgets Grid */}
                    <div className="space-y-6">
                        {visibleWidgets.map((widget) => {
                            switch (widget.component) {
                                case 'SalesOverview':
                                    return <SalesOverviewWidgetComponent key={widget.id} />;
                                case 'QuickStats':
                                    return <QuickStatsWidget key={widget.id} />;
                                case 'TaskSummary':
                                    return <TaskSummaryWidget key={widget.id} />;
                                case 'RecurringTaskSummary':
                                    return <RecurringTaskSummaryWidget key={widget.id} />;
                                case 'ServiceWiseSales':
                                    return <ServiceWiseSalesWidget key={widget.id} />;
                                case 'StaffWiseSales':
                                    return <StaffWiseSalesWidget key={widget.id} />;
                                case 'TopClients':
                                    return <TopClientsWidget key={widget.id} />;
                                case 'AdditionalStats':
                                    return <AdditionalStatsWidget key={widget.id} />;
                                case 'PerformanceMetrics':
                                    return <PerformanceMetricsWidget key={widget.id} />;
                                case 'RevenueTrend':
                                    return <RevenueTrendWidget key={widget.id} />;
                                case 'ClientAcquisition':
                                    return <ClientAcquisitionWidget key={widget.id} />;
                                case 'GoalProgress':
                                    return <GoalProgressWidget key={widget.id} />;
                                default:
                                    return null;
                            }
                        })}
                    </div>
                </div>
            </div>

            {/* Customization Sidebar */}
            <AnimatePresence>
                {isCustomizing && <CustomizationSidebar />}
            </AnimatePresence>

            {/* Overlay */}
            <AnimatePresence>
                {isCustomizing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={cancelCustomization}
                        className="fixed inset-0 bg-black/30 z-30"
                    />
                )}
            </AnimatePresence>

            <OmiFloatingBot />

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;