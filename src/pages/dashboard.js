import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, Header } from '../components/header';
import {
    FiTrendingUp,
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
    FiClock
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import TaskSummary from '../DashboardComponents/task-summary';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import AdditionalStatsComponent from '../DashboardComponents/additional-stats';
import QuickStats from '../DashboardComponents/quick-stats';
import ServiceWiseSales  from '../DashboardComponents/serviceWiseSales';
import StaffWiseSales from '../DashboardComponents/staffWiseSales';
import TopClients from '../DashboardComponents/TopClients';
import { useNavigate } from 'react-router-dom';

// Version constants for localStorage migration
const DASHBOARD_VERSION = '2';
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

// Helper function to migrate old additional stats links
const migrateAdditionalStatsLinks = (cards) => {
    // Additional stats links are correct, but we keep this for future migrations
    return cards;
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
        id: 'service-wise-sales',
        title: 'Service Wise Sales',
        component: 'ServiceWiseSales',
        visible: true,
        order: 3,
        icon: FiPieChart,
        category: 'sales'
    },
    {
        id: 'staff-wise-sales',
        title: 'Staff Wise Sales',
        component: 'StaffWiseSales',
        visible: true,
        order: 4,
        icon: FiUsers,
        category: 'sales'
    },
    {
        id: 'top-clients',
        title: 'Top Clients',
        component: 'TopClients',
        visible: true,
        order: 5,
        icon: FiAward,
        category: 'clients'
    },
    {
        id: 'additional-stats',
        title: 'Additional Stats',
        component: 'AdditionalStats',
        visible: true,
        order: 6,
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
    
    // Customization state
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);
    
    // Dashboard Widgets with version control and migration
    const [widgets, setWidgets] = useState(() => {
        const savedVersion = localStorage.getItem('dashboardVersion');
        const savedLayout = localStorage.getItem('dashboardLayout');
        
        // If no saved layout or version mismatch, use default
        if (!savedLayout || savedVersion !== DASHBOARD_VERSION) {
            const defaultLayout = getDefaultWidgets();
            localStorage.setItem('dashboardLayout', JSON.stringify(defaultLayout));
            localStorage.setItem('dashboardVersion', DASHBOARD_VERSION);
            return defaultLayout;
        }
        
        return JSON.parse(savedLayout);
    });

    const [draggedWidget, setDraggedWidget] = useState(null);
    const [dragOverWidget, setDragOverWidget] = useState(null);
    
    // Quick Stats Cards with version control and migration
    const [quickStatsCards, setQuickStatsCards] = useState(() => {
        const savedVersion = localStorage.getItem('quickStatsVersion');
        const savedCards = localStorage.getItem('quickStatsCards');
        
        // If no saved cards or version mismatch, use default
        if (!savedCards || savedVersion !== QUICK_STATS_VERSION) {
            const defaultCards = getDefaultQuickStatsCards();
            localStorage.setItem('quickStatsCards', JSON.stringify(defaultCards));
            localStorage.setItem('quickStatsVersion', QUICK_STATS_VERSION);
            return defaultCards;
        }
        
        // Parse saved cards
        const cards = JSON.parse(savedCards);
        
        // Check if migration is needed (old links)
        const needsMigration = cards.some(card => 
            card.link === '/view-billing' || 
            card.link === '/view-creditors' || 
            card.link === '/view-debtors' ||
            card.link === '/view-received' ||
            card.link === '/view-payments' ||
            card.link === '/view-birthday-today'
        );
        
        if (needsMigration) {
            const migratedCards = migrateQuickStatsLinks(cards);
            localStorage.setItem('quickStatsCards', JSON.stringify(migratedCards));
            localStorage.setItem('quickStatsVersion', QUICK_STATS_VERSION);
            return migratedCards;
        }
        
        return cards;
    });

    // Additional Stats Cards with version control and migration
    const [additionalStatsCards, setAdditionalStatsCards] = useState(() => {
        const savedVersion = localStorage.getItem('additionalStatsVersion');
        const savedCards = localStorage.getItem('additionalStatsCards');
        
        // If no saved cards or version mismatch, use default
        if (!savedCards || savedVersion !== ADDITIONAL_STATS_VERSION) {
            const defaultCards = getDefaultAdditionalStatsCards();
            localStorage.setItem('additionalStatsCards', JSON.stringify(defaultCards));
            localStorage.setItem('additionalStatsVersion', ADDITIONAL_STATS_VERSION);
            return defaultCards;
        }
        
        const cards = JSON.parse(savedCards);
        
        // Check if migration is needed
        const needsMigration = migrateAdditionalStatsLinks(cards) !== cards;
        
        if (needsMigration) {
            const migratedCards = migrateAdditionalStatsLinks(cards);
            localStorage.setItem('additionalStatsCards', JSON.stringify(migratedCards));
            localStorage.setItem('additionalStatsVersion', ADDITIONAL_STATS_VERSION);
            return migratedCards;
        }
        
        return cards;
    });

    const [draggedCard, setDraggedCard] = useState(null);
    const [dragOverCard, setDragOverCard] = useState(null);
    const [draggedCardSource, setDraggedCardSource] = useState(null);

    // Available widgets for adding
    const [availableWidgets, setAvailableWidgets] = useState([
        {
            id: 'performance-metrics',
            title: 'Performance Metrics',
            component: 'PerformanceMetrics',
            visible: false,
            order: 7,
            icon: FiActivity,
            category: 'analytics'
        },
        {
            id: 'revenue-trend',
            title: 'Revenue Trend',
            component: 'RevenueTrend',
            visible: false,
            order: 8,
            icon: FiTrendingUp,
            category: 'sales'
        },
        {
            id: 'client-acquisition',
            title: 'Client Acquisition',
            component: 'ClientAcquisition',
            visible: false,
            order: 9,
            icon: FiBriefcase,
            category: 'clients'
        },
        {
            id: 'goal-progress',
            title: 'Goal Progress',
            component: 'GoalProgress',
            visible: false,
            order: 10,
            icon: FiTarget,
            category: 'overview'
        }
    ]);

    // Predefined templates
    const predefinedTemplates = {
        default: {
            name: 'Default Layout',
            description: 'Balanced view with all essential widgets',
            icon: FiGrid,
            widgets: [
                'sales-overview',
                'quick-stats',
                'task-summary',
                'service-wise-sales',
                'staff-wise-sales',
                'top-clients',
                'additional-stats'
            ]
        },
        salesFocus: {
            name: 'Sales Focus',
            description: 'Focus on sales and revenue metrics',
            icon: FiTrendingUp,
            widgets: [
                'sales-overview',
                'service-wise-sales',
                'staff-wise-sales',
                'revenue-trend',
                'quick-stats',
                'top-clients'
            ]
        },
        taskManagement: {
            name: 'Task Management',
            description: 'Focus on task tracking and productivity',
            icon: FiCalendar,
            widgets: [
                'task-summary',
                'quick-stats',
                'performance-metrics',
                'goal-progress',
                'additional-stats'
            ]
        },
        executiveView: {
            name: 'Executive View',
            description: 'High-level overview for management',
            icon: FiBriefcase,
            widgets: [
                'sales-overview',
                'performance-metrics',
                'revenue-trend',
                'goal-progress',
                'top-clients'
            ]
        },
        analyticsHeavy: {
            name: 'Analytics Heavy',
            description: 'Data-driven view with maximum analytics',
            icon: FiBarChart2,
            widgets: [
                'performance-metrics',
                'revenue-trend',
                'service-wise-sales',
                'staff-wise-sales',
                'client-acquisition',
                'goal-progress'
            ]
        }
    };

    // Data-based layout suggestions
    const getDataBasedSuggestions = () => {
        const suggestions = [];
        
        if (stats.total_sale > 1000000) {
            suggestions.push({
                title: "High Revenue Focus",
                description: "Your sales are high. Focus on maintaining growth.",
                recommendedWidgets: ['revenue-trend', 'performance-metrics', 'goal-progress']
            });
        }
        
        if (stats.task_create_today > 30) {
            suggestions.push({
                title: "Task Management Focus",
                description: "High task activity detected.",
                recommendedWidgets: ['task-summary', 'performance-metrics']
            });
        }
        
        if (stats.total_client > 300) {
            suggestions.push({
                title: "Client Management Focus",
                description: "Large client base detected.",
                recommendedWidgets: ['client-acquisition', 'top-clients']
            });
        }
        
        return suggestions;
    };

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Save layout to localStorage when not customizing
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

    const mockStats = {
        total_sale: 1250000,
        pending_for_billing: 23,
        today_received: 45000,
        creditor: 125000,
        today_payment: 28000,
        debtor: 89000,
        today_birthday: 3,
        total_client: 456,
        new_client: 12,
        active_client: 389,
        total_stuff: 24,
        present_today: 18,
        task_create_today: 45,
        task_complete_today: 38,
        net_profit: 285000
    };

    const mockTaskStats = [
        {
            name: 'GST Filing',
            OD: 2,
            DT: 1,
            D7: 3,
            FT: 8,
            WIP: 5,
            PFC: 2,
            PFD: 1,
            CPL: 15,
            CNL: 0
        },
        {
            name: 'Income Tax',
            OD: 1,
            DT: 0,
            D7: 2,
            FT: 6,
            WIP: 3,
            PFC: 1,
            PFD: 0,
            CPL: 12,
            CNL: 1
        },
        {
            name: 'Company Registration',
            OD: 0,
            DT: 2,
            D7: 1,
            FT: 4,
            WIP: 2,
            PFC: 0,
            PFD: 1,
            CPL: 8,
            CNL: 0
        }
    ];

    const mockTopClients = [
        {
            name: 'Rajesh Kumar',
            guardian_name: 'Suresh Kumar',
            mobile: '+91 9876543210',
            email: 'rajesh@company.com',
            firms: 'Manufacturing, Trading',
            total: 450000
        },
        {
            name: 'Priya Sharma',
            guardian_name: 'Ramesh Sharma',
            mobile: '+91 9876543211',
            email: 'priya@company.com',
            firms: 'Services',
            total: 380000
        },
        {
            name: 'Amit Singh',
            guardian_name: 'Vikram Singh',
            mobile: '+91 9876543212',
            email: 'amit@company.com',
            firms: 'IT Services',
            total: 320000
        }
    ];

    // Load initial data
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const response = await fetch(`${API_BASE_URL}/report/dashboard-summary`, {
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
                } else {
                    setTaskStats(mockTaskStats);
                }
                
                if (result.data.top_clients) {
                    setTopClients(result.data.top_clients);
                } else {
                    setTopClients(mockTopClients);
                }
                
                localStorage.setItem('dashboardFullData', JSON.stringify(result));
            } else {
                throw new Error(result.message || 'Failed to fetch dashboard data');
            }
        } catch (err) {
            console.error('Dashboard API Error:', err);
            setStats(mockStats);
            setTaskStats(mockTaskStats);
            setTopClients(mockTopClients);
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

    // Drag and drop handlers for widgets
    const handleWidgetDragStart = useCallback((e, widgetId) => {
        if (!isCustomizing) return;
        e.stopPropagation();
        setDraggedWidget(widgetId);
        e.dataTransfer.setData('widgetId', widgetId);
        e.dataTransfer.effectAllowed = 'move';
    }, [isCustomizing]);

    const handleWidgetDragOver = useCallback((e, widgetId) => {
        if (!isCustomizing || !draggedWidget) return;
        e.stopPropagation();
        e.preventDefault();
        if (widgetId !== draggedWidget) {
            setDragOverWidget(widgetId);
        }
    }, [isCustomizing, draggedWidget]);

    const handleWidgetDrop = useCallback((e, targetWidgetId) => {
        if (!isCustomizing || !draggedWidget) return;
        e.stopPropagation();
        e.preventDefault();
        
        if (draggedWidget !== targetWidgetId) {
            setWidgets(prevWidgets => {
                const draggedIndex = prevWidgets.findIndex(w => w.id === draggedWidget);
                const targetIndex = prevWidgets.findIndex(w => w.id === targetWidgetId);
                
                if (draggedIndex === -1 || targetIndex === -1) return prevWidgets;
                
                const newWidgets = [...prevWidgets];
                const [removed] = newWidgets.splice(draggedIndex, 1);
                newWidgets.splice(targetIndex, 0, removed);
                
                return newWidgets.map((widget, index) => ({
                    ...widget,
                    order: index
                }));
            });
        }
        setDraggedWidget(null);
        setDragOverWidget(null);
    }, [isCustomizing, draggedWidget]);

    const handleWidgetDragEnd = useCallback(() => {
        setDraggedWidget(null);
        setDragOverWidget(null);
    }, []);

    // Drag and drop handlers for cards inside components
    const handleCardDragStart = useCallback((e, cardId, source) => {
        if (!isCustomizing) return;
        e.stopPropagation();
        setDraggedCard(cardId);
        setDraggedCardSource(source);
        e.dataTransfer.setData('cardId', cardId);
        e.dataTransfer.setData('source', source);
        e.dataTransfer.effectAllowed = 'move';
    }, [isCustomizing]);

    const handleCardDragOver = useCallback((e, cardId, source) => {
        if (!isCustomizing || !draggedCard || draggedCardSource !== source) return;
        e.stopPropagation();
        e.preventDefault();
        if (cardId !== draggedCard) {
            setDragOverCard(cardId);
        }
    }, [isCustomizing, draggedCard, draggedCardSource]);

    const handleCardDrop = useCallback((e, targetCardId, source) => {
        if (!isCustomizing || !draggedCard || draggedCardSource !== source) return;
        e.stopPropagation();
        e.preventDefault();
        
        if (draggedCard !== targetCardId) {
            if (source === 'quickStats') {
                setQuickStatsCards(prevCards => {
                    const draggedIndex = prevCards.findIndex(c => c.id === draggedCard);
                    const targetIndex = prevCards.findIndex(c => c.id === targetCardId);
                    
                    if (draggedIndex === -1 || targetIndex === -1) return prevCards;
                    
                    const newCards = [...prevCards];
                    const [removed] = newCards.splice(draggedIndex, 1);
                    newCards.splice(targetIndex, 0, removed);
                    return newCards;
                });
            } else if (source === 'additionalStats') {
                setAdditionalStatsCards(prevCards => {
                    const draggedIndex = prevCards.findIndex(c => c.id === draggedCard);
                    const targetIndex = prevCards.findIndex(c => c.id === targetCardId);
                    
                    if (draggedIndex === -1 || targetIndex === -1) return prevCards;
                    
                    const newCards = [...prevCards];
                    const [removed] = newCards.splice(draggedIndex, 1);
                    newCards.splice(targetIndex, 0, removed);
                    return newCards;
                });
            }
        }
        setDraggedCard(null);
        setDragOverCard(null);
        setDraggedCardSource(null);
    }, [isCustomizing, draggedCard, draggedCardSource]);

    const handleCardDragEnd = useCallback(() => {
        setDraggedCard(null);
        setDragOverCard(null);
        setDraggedCardSource(null);
    }, []);

    // Widget management
    const toggleWidgetVisibility = useCallback((widgetId) => {
        if (!isCustomizing) return;
        setWidgets(items =>
            items.map(item =>
                item.id === widgetId
                    ? { ...item, visible: !item.visible }
                    : item
            )
        );
    }, [isCustomizing]);

    const deleteWidget = useCallback((widgetId) => {
        if (!isCustomizing) return;
        setWidgets(items => items.filter(item => item.id !== widgetId));
        
        const widget = widgets.find(w => w.id === widgetId);
        if (widget && availableWidgets.find(aw => aw.id === widgetId)) {
            setAvailableWidgets(prev => 
                prev.map(w => w.id === widgetId ? { ...w, visible: false } : w)
            );
        }
    }, [isCustomizing, widgets, availableWidgets]);

    const addWidget = useCallback((widgetId) => {
        if (!isCustomizing) return;
        
        const widgetToAdd = availableWidgets.find(w => w.id === widgetId) || widgets.find(w => w.id === widgetId);
        if (widgetToAdd) {
            const newWidget = {
                ...widgetToAdd,
                visible: true,
                order: widgets.length
            };
            setWidgets(prev => [...prev.filter(w => w.id !== widgetId), newWidget]);
            setAvailableWidgets(prev => 
                prev.map(w => w.id === widgetId ? { ...w, visible: true } : w)
            );
        }
    }, [isCustomizing, widgets, availableWidgets]);

    const applyTemplate = useCallback((templateName) => {
        const template = predefinedTemplates[templateName];
        if (!template) return;
        
        const newWidgets = template.widgets.map((widgetId, index) => {
            const existingWidget = widgets.find(w => w.id === widgetId);
            const availableWidget = availableWidgets.find(w => w.id === widgetId);
            
            if (existingWidget) {
                return { ...existingWidget, visible: true, order: index };
            } else if (availableWidget) {
                return { ...availableWidget, visible: true, order: index };
            }
            return null;
        }).filter(Boolean);
        
        const defaultWidgets = widgets.filter(w => 
            !template.widgets.includes(w.id) && 
            ['quick-stats', 'additional-stats'].includes(w.id)
        ).map(w => ({ ...w, order: newWidgets.length + 1 }));
        
        setWidgets([...newWidgets, ...defaultWidgets]);
    }, [widgets, availableWidgets]);

    const resetLayout = useCallback(() => {
        const defaultLayout = getDefaultWidgets();
        const defaultQuickStats = getDefaultQuickStatsCards();
        const defaultAdditionalStats = getDefaultAdditionalStatsCards();
        
        setWidgets(defaultLayout);
        setQuickStatsCards(defaultQuickStats);
        setAdditionalStatsCards(defaultAdditionalStats);
        
        // Save to localStorage with versions
        localStorage.setItem('dashboardLayout', JSON.stringify(defaultLayout));
        localStorage.setItem('dashboardVersion', DASHBOARD_VERSION);
        localStorage.setItem('quickStatsCards', JSON.stringify(defaultQuickStats));
        localStorage.setItem('quickStatsVersion', QUICK_STATS_VERSION);
        localStorage.setItem('additionalStatsCards', JSON.stringify(defaultAdditionalStats));
        localStorage.setItem('additionalStatsVersion', ADDITIONAL_STATS_VERSION);
    }, []);

    const saveLayout = useCallback(() => {
        setIsCustomizing(false);
        setShowCustomizeMenu(false);
        localStorage.setItem('dashboardLayout', JSON.stringify(widgets));
        localStorage.setItem('dashboardVersion', DASHBOARD_VERSION);
        localStorage.setItem('quickStatsCards', JSON.stringify(quickStatsCards));
        localStorage.setItem('quickStatsVersion', QUICK_STATS_VERSION);
        localStorage.setItem('additionalStatsCards', JSON.stringify(additionalStatsCards));
        localStorage.setItem('additionalStatsVersion', ADDITIONAL_STATS_VERSION);
    }, [widgets, quickStatsCards, additionalStatsCards]);

    // Widget Wrapper Component
    const WidgetWrapper = React.memo(({ widgetId, title, children, className = '' }) => {
        const isVisible = widgets.find(w => w.id === widgetId)?.visible ?? true;
        
        if (!isVisible) return null;

        const isDragged = draggedWidget === widgetId;
        const isDragOver = dragOverWidget === widgetId;

        return (
            <div
                draggable={isCustomizing}
                onDragStart={(e) => handleWidgetDragStart(e, widgetId)}
                onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                onDrop={(e) => handleWidgetDrop(e, widgetId)}
                onDragEnd={handleWidgetDragEnd}
                className={`relative ${isCustomizing ? 'cursor-move select-none' : ''} ${
                    isDragged ? 'opacity-50' : ''
                } ${isDragOver ? 'border-2 border-dashed border-indigo-500 rounded-2xl' : ''} ${className}`}
                style={{ 
                    pointerEvents: isCustomizing ? 'auto' : 'auto',
                    userSelect: isCustomizing ? 'none' : 'auto'
                }}
            >
                {isCustomizing && (
                    <div className="absolute -top-3 -left-3 z-10 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg">
                            <FiMove className="w-3 h-3 text-white" />
                        </div>
                    </div>
                )}

                {isCustomizing && (
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                        <button
                            onClick={() => toggleWidgetVisibility(widgetId)}
                            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-all duration-200 hover:scale-110"
                            title="Hide widget"
                        >
                            <FiEye className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                            onClick={() => deleteWidget(widgetId)}
                            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-red-50 transition-all duration-200 hover:scale-110"
                            title="Remove widget"
                        >
                            <FiTrash2 className="w-4 h-4 text-red-600" />
                        </button>
                    </div>
                )}

                <motion.div
                    animate={{
                        scale: isCustomizing ? 1.01 : 1,
                        borderColor: isCustomizing ? '#6366f1' : 'transparent'
                    }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden"
                    style={{ 
                        pointerEvents: isCustomizing ? 'none' : 'auto'
                    }}
                >
                    {children}
                </motion.div>
            </div>
        );
    });

    WidgetWrapper.displayName = 'WidgetWrapper';

    // Widget Components
    const SalesOverviewWidget = () => (
        <WidgetWrapper widgetId="sales-overview" title="Sales Overview" className="col-span-full">
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100/50 to-purple-100/50 rounded-full -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-100/30 to-cyan-100/30 rounded-full -translate-x-48 translate-y-48" />
                
                <div className="relative p-8 md:p-12">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative">
                                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                                        <FiTrendingUp className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute -top-2 -right-2">
                                        <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500"></span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-2xl md:text-3xl font-bold text-gray-800">
                                            Congratulations! 
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 mt-2">Outstanding performance this fiscal year!</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <p className="text-gray-500 mb-2">Current FY Total Sales</p>
                                <div className="flex items-end gap-4">
                                    <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent ${blurEnabled ? 'blur' : ''}`}>
                                        {formatCurrency(stats.total_sale || 0)}
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full">
                                        <FiTrendingUp className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-semibold text-green-600">+24.5%</span>
                                    </div>
                                </div>
                                <p className="text-gray-500 mt-3">Achieved 92% of annual target</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
                                    <div className="text-sm text-gray-600">Growth Rate</div>
                                    <div className="text-xl font-bold text-green-600">24.5%</div>
                                </div>
                                <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
                                    <div className="text-sm text-gray-600">Net Profit</div>
                                    <div className="text-xl font-bold text-indigo-600">{formatCurrency(stats.net_profit || 0)}</div>
                                </div>
                                <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
                                    <div className="text-sm text-gray-600">Active Clients</div>
                                    <div className="text-xl font-bold text-purple-600">{stats.active_client || 0}</div>
                                </div>
                                <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
                                    <div className="text-sm text-gray-600">Task Completion</div>
                                    <div className="text-xl font-bold text-blue-600">{stats.task_complete_today || 0}</div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <motion.button 
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="flex items-center gap-2">
                                        <FiBarChart2 className="w-5 h-5" />
                                        View Sales Report
                                    </div>
                                </motion.button>
                                <motion.button 
                                    className="px-6 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-300 hover:shadow-lg hover:scale-105"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="flex items-center gap-2">
                                        <FiDownload className="w-5 h-5" />
                                        Export Data
                                    </div>
                                </motion.button>
                            </div>
                        </div>

                        <div className="lg:w-1/3">
                            <div className="relative">
                                <div className="w-64 h-64 mx-auto relative">
                                    <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="4"/>
                                        <motion.circle 
                                            cx="50" cy="50" r="45" fill="none" 
                                            stroke="url(#gradient)" strokeWidth="6" strokeLinecap="round"
                                            initial={{ strokeDasharray: '0, 283' }}
                                            animate={{ strokeDasharray: '283, 283' }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                            transform="rotate(-90 50 50)"
                                        />
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="text-4xl font-bold text-indigo-600">92%</div>
                                            <div className="text-gray-600">Target Achieved</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                    <FiAward className="w-8 h-8 text-white" />
                                </div>
                                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                    <FiTrendingUp className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    );

    const QuickStatsWidget = () => (
        <WidgetWrapper widgetId="quick-stats" title="Quick Stats">
            <div className="p-6">
                <QuickStats
                    stats={stats}
                    isCustomizing={isCustomizing}
                    onCardDragStart={handleCardDragStart}
                    onCardDragOver={handleCardDragOver}
                    onCardDrop={handleCardDrop}
                    onCardDragEnd={handleCardDragEnd}
                    draggedCard={draggedCard}
                    dragOverCard={dragOverCard}
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
    );

    const TaskSummaryWidget = () => (
        <WidgetWrapper widgetId="task-summary" title="Task Summary">
            <TaskSummary 
                taskStats={taskStats}
                onRefresh={() => fetchDashboardData()}
                onCreateTask={() => navigate('/task/create')}
            />
        </WidgetWrapper>
    );

const ServiceWiseSalesWidget = () => (
    <WidgetWrapper widgetId="service-wise-sales" title="Service Wise Sales">
        <ServiceWiseSales 
            onViewDetails={() => navigate('/sales/service-wise')}
            refreshTrigger={refreshKey}
        />
    </WidgetWrapper>
);

const StaffWiseSalesWidget = () => (
    <WidgetWrapper widgetId="staff-wise-sales" title="Staff Wise Sales">
        <StaffWiseSales 
            onViewDetails={() => navigate('/sales/staff-wise')}
            refreshTrigger={refreshKey}
        />
    </WidgetWrapper>
);
// Use this container to show them side by side
const SalesWidgetsContainer = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <ServiceWiseSalesWidget />
        <StaffWiseSalesWidget />
    </div>
);
    // Update the TopClientsWidget component
const TopClientsWidget = () => (
    <WidgetWrapper widgetId="top-clients" title="Top Clients">
        <TopClients 
            defaultDays={30}
            onViewDetails={() => navigate('/clients/top')}
            refreshTrigger={refreshKey}
        />
    </WidgetWrapper>
);

    const AdditionalStatsWidget = () => (
        <WidgetWrapper widgetId="additional-stats" title="Additional Stats">
            <AdditionalStatsComponent
                stats={stats}
                isCustomizing={isCustomizing}
                onCardDragStart={handleCardDragStart}
                onCardDragOver={handleCardDragOver}
                onCardDrop={handleCardDrop}
                onCardDragEnd={handleCardDragEnd}
                draggedCard={draggedCard}
                dragOverCard={dragOverCard}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                blurEnabled={blurEnabled}
                onNavigate={(link) => navigate(link)}
            />
        </WidgetWrapper>
    );

    const PerformanceMetricsWidget = () => (
        <WidgetWrapper widgetId="performance-metrics" title="Performance Metrics">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                        <FiActivity className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Performance Metrics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-600 font-medium">Productivity Score</span>
                            <span className="text-2xl font-bold text-indigo-600">87%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <motion.div 
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '87%' }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <div className="mt-4 text-sm text-gray-500">↑ 12% from last month</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-600 font-medium">Client Satisfaction</span>
                            <span className="text-2xl font-bold text-green-600">92%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <motion.div 
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '92%' }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <div className="mt-4 text-sm text-gray-500">↑ 8% from last month</div>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    );

    const RevenueTrendWidget = () => (
        <WidgetWrapper widgetId="revenue-trend" title="Revenue Trend">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                        <FiTrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Revenue Trend</h3>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-green-600 mb-2">+24.5%</div>
                        <div className="text-lg font-medium text-gray-700 mb-1">Growth this quarter</div>
                        <p className="text-gray-500">Compared to previous quarter</p>
                    </div>
                    <div className="mt-8 h-32 flex items-end justify-center gap-4">
                        {[30, 50, 70, 90, 75, 85, 95].map((height, index) => (
                            <motion.div
                                key={index}
                                className="w-8 bg-gradient-to-t from-green-400 to-emerald-500 rounded-t-lg"
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    );

    const ClientAcquisitionWidget = () => (
        <WidgetWrapper widgetId="client-acquisition" title="Client Acquisition">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                        <FiBriefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Client Acquisition</h3>
                </div>
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm text-gray-600 mb-1">New Clients</div>
                                <div className="text-2xl font-bold text-blue-600">12</div>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <FiUserPlus className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <div className="mt-3 text-sm text-gray-500">Goal: 20 clients</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm text-gray-600 mb-1">Active Clients</div>
                                <div className="text-2xl font-bold text-emerald-600">389</div>
                            </div>
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <FiUsers className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <div className="mt-3 text-sm text-gray-500">↑ 15% retention rate</div>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    );

    const GoalProgressWidget = () => (
        <WidgetWrapper widgetId="goal-progress" title="Goal Progress">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl">
                        <FiTarget className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Goal Progress</h3>
                </div>
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border border-purple-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm text-gray-600 mb-1">Monthly Sales Target</div>
                                <div className="text-2xl font-bold text-purple-600">75%</div>
                            </div>
                            <div className="text-2xl">🎯</div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <motion.div 
                                className="bg-gradient-to-r from-purple-500 to-violet-500 h-3 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '75%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </div>
                        <div className="mt-3 text-sm text-gray-500">₹9.4L / ₹12.5L target</div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm text-gray-600 mb-1">Client Acquisition</div>
                                <div className="text-2xl font-bold text-indigo-600">90%</div>
                            </div>
                            <div className="text-2xl">🚀</div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <motion.div 
                                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-3 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '90%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </div>
                        <div className="mt-3 text-sm text-gray-500">18/20 new clients</div>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    );

    // Customization Panel Component
    const CustomizationPanel = () => {
        const dataSuggestions = getDataBasedSuggestions();
        const hiddenWidgets = widgets.filter(w => !w.visible);
        const newAvailableWidgets = availableWidgets.filter(w => !w.visible);

        return (
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 mb-6"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Templates */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiLayers className="w-5 h-5 text-indigo-600" />
                            Predefined Templates
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(predefinedTemplates).map(([key, template]) => {
                                const TemplateIcon = template.icon || FiGrid;
                                return (
                                    <motion.button
                                        key={key}
                                        onClick={() => applyTemplate(key)}
                                        className="w-full p-4 text-left bg-gradient-to-r from-gray-50 to-white hover:from-indigo-50 hover:to-white rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-indigo-200"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                                                <TemplateIcon className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-800">{template.name}</div>
                                                <div className="text-sm text-gray-500">{template.description}</div>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Middle Column - Add Widgets */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiPlus className="w-5 h-5 text-green-600" />
                            Add Widgets
                        </h3>
                        <div className="space-y-3">
                            {[...hiddenWidgets, ...newAvailableWidgets].map((widget) => {
                                const WidgetIcon = widget.icon || FiGrid;
                                return (
                                    <motion.button
                                        key={widget.id}
                                        onClick={() => addWidget(widget.id)}
                                        className="w-full p-4 text-left bg-gradient-to-r from-gray-50 to-white hover:from-green-50 hover:to-white rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-green-200"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                                                <WidgetIcon className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-800">{widget.title}</div>
                                                <div className="text-sm text-gray-500 capitalize">{widget.category}</div>
                                            </div>
                                            <div className="ml-auto">
                                                <FiPlus className="w-4 h-4 text-green-600" />
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                            {[...hiddenWidgets, ...newAvailableWidgets].length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <FiCheck className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                    <p>All available widgets are added</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Data Based Suggestions */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiStar className="w-5 h-5 text-yellow-600" />
                            Smart Suggestions
                        </h3>
                        <div className="space-y-3">
                            {dataSuggestions.map((suggestion, index) => (
                                <motion.div
                                    key={index}
                                    className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-100"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="font-semibold text-gray-800 mb-1">{suggestion.title}</div>
                                    <div className="text-sm text-gray-600 mb-3">{suggestion.description}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestion.recommendedWidgets.map(widgetId => {
                                            const widget = [...widgets, ...availableWidgets].find(w => w.id === widgetId);
                                            if (!widget) return null;
                                            const WidgetIcon = widget.icon || FiGrid;
                                            return (
                                                <button
                                                    key={widgetId}
                                                    onClick={() => addWidget(widgetId)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 rounded-full text-sm hover:shadow-md transition-all duration-300"
                                                >
                                                    <WidgetIcon className="w-3 h-3" />
                                                    {widget.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                            {dataSuggestions.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <FiActivity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <p>No data-based suggestions available</p>
                                    <p className="text-sm">More suggestions will appear as you use the system</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    // Customization Mode Toolbar
    const CustomizationToolbar = () => (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 mb-6 rounded-2xl shadow-xl"
        >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        <FiLayout className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Dashboard Customization Mode</h3>
                        <p className="text-indigo-200 text-sm">
                            Drag widgets to reorder • Drag cards inside widgets to reorder • Click icons to hide/delete
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        onClick={resetLayout}
                        className="px-5 py-2.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-all duration-300 hover:scale-105"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Reset Layout
                    </motion.button>
                    <motion.button
                        onClick={saveLayout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FiCheck className="w-4 h-4" />
                        Save & Exit
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );

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
                                className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 shadow-lg"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="p-3 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl">
                                        <FiAward className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-red-800 text-lg">
                                            ALERT: Your subscription will expire in 7 days.
                                        </div>
                                        <div className="text-red-600 text-sm">
                                            Renew your subscription to continue uninterrupted service
                                        </div>
                                    </div>
                                    <motion.button 
                                        className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Renew Now
                                    </motion.button>
                                </div>
                            </motion.div>
                        </div>
                        
                        {/* Customize Button */}
                        <div className="flex items-center justify-center pt-5">
                            <div className="relative">
                                <motion.button
                                    onClick={() => setShowCustomizeMenu(!showCustomizeMenu)}
                                    className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-300 hover:scale-105"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiMoreVertical className="w-5 h-5 text-gray-700" />
                                </motion.button>

                                {/* Customize Menu Dropdown */}
                                <AnimatePresence>
                                    {showCustomizeMenu && !isCustomizing && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-12 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 min-w-[240px]"
                                        >
                                            <div className="p-2">
                                                <button
                                                    onClick={() => {
                                                        setIsCustomizing(true);
                                                        setShowCustomizeMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gradient-to-r from-indigo-50 to-white rounded-lg transition-all duration-300"
                                                >
                                                    <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                                                        <FiGrid className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800">Customize Layout</div>
                                                        <div className="text-xs text-gray-500">Rearrange and modify widgets</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        resetLayout();
                                                        setShowCustomizeMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gradient-to-r from-gray-50 to-white rounded-lg transition-all duration-300"
                                                >
                                                    <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
                                                        <FiRefreshCw className="w-4 h-4 text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800">Reset to Default</div>
                                                        <div className="text-xs text-gray-500">Restore original layout</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setBlurEnabled(!blurEnabled);
                                                        setShowCustomizeMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gradient-to-r from-gray-50 to-white rounded-lg transition-all duration-300"
                                                >
                                                    <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                                                        {blurEnabled ? (
                                                            <FiEye className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                            <FiEyeOff className="w-4 h-4 text-gray-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800">
                                                            {blurEnabled ? 'Show Values' : 'Hide Values'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {blurEnabled ? 'Display all values' : 'Blur sensitive data'}
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Customization Toolbar */}
                    <AnimatePresence>
                        {isCustomizing && (
                            <>
                                <CustomizationToolbar />
                                <CustomizationPanel />
                            </>
                        )}
                    </AnimatePresence>

                    {/* Dashboard Widgets Grid - FULL WIDTH with proper spacing */}
                    <div className={`grid grid-cols-1 ${isCustomizing ? 'pb-20' : ''} space-y-8`}>
                        {widgets
                            .filter(widget => widget.visible)
                            .sort((a, b) => a.order - b.order)
                            .map((widget) => {
                                switch (widget.component) {
                                    case 'SalesOverview':
                                        return <SalesOverviewWidget key={widget.id} />;
                                    case 'QuickStats':
                                        return <QuickStatsWidget key={widget.id} />;
                                    case 'TaskSummary':
                                        return <TaskSummaryWidget key={widget.id} />;
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

                    {/* Save Button (Fixed at bottom during customization) */}
                    <AnimatePresence>
                        {isCustomizing && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20"
                            >
                                <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-200 min-w-[320px] backdrop-blur-sm bg-white/95">
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="text-center sm:text-left">
                                            <p className="font-bold text-gray-800">Customization Mode Active</p>
                                            <p className="text-sm text-gray-500">Drag widgets and cards to customize</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setIsCustomizing(false);
                                                    setShowCustomizeMenu(false);
                                                }}
                                                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-300"
                                            >
                                                Cancel
                                            </button>
                                            <motion.button
                                                onClick={saveLayout}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FiCheck className="w-4 h-4" />
                                                Save Layout
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Custom CSS for animations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                .animation-delay-100 {
                    animation-delay: 0.1s;
                }
                .animation-delay-200 {
                    animation-delay: 0.2s;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;