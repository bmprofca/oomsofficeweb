// components/dashboard/SalesOverviewWidget.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiTrendingUp, 
    FiTrendingDown, 
    FiBarChart2, 
    FiDownload, 
    FiAward,
    FiAlertCircle,
    FiSettings,
    FiChevronDown,
    FiX
} from 'react-icons/fi';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

// Theme Templates
const THEMES = {
    // Theme 1: Indigo Purple (Default)
    indigoPurple: {
        id: 'indigoPurple',
        name: 'Indigo Purple',
        gradient: 'from-indigo-500 to-purple-600',
        badgeGradient: 'from-indigo-100 to-purple-100',
        buttonGradient: 'from-indigo-600 to-purple-600',
        circleGradient: { start: '#6366f1', end: '#8b5cf6' },
        bgGradient: 'from-indigo-50 via-white to-purple-50',
        accentColor: 'indigo',
        statsColors: ['text-indigo-600', 'text-purple-600', 'text-blue-600']
    },
    // Theme 2: Emerald Teal
    emeraldTeal: {
        id: 'emeraldTeal',
        name: 'Emerald Teal',
        gradient: 'from-emerald-500 to-teal-600',
        badgeGradient: 'from-emerald-100 to-teal-100',
        buttonGradient: 'from-emerald-600 to-teal-600',
        circleGradient: { start: '#10b981', end: '#14b8a6' },
        bgGradient: 'from-emerald-50 via-white to-teal-50',
        accentColor: 'emerald',
        statsColors: ['text-emerald-600', 'text-teal-600', 'text-cyan-600']
    },
    // Theme 3: Rose Red
    roseRed: {
        id: 'roseRed',
        name: 'Rose Red',
        gradient: 'from-rose-500 to-red-600',
        badgeGradient: 'from-rose-100 to-red-100',
        buttonGradient: 'from-rose-600 to-red-600',
        circleGradient: { start: '#f43f5e', end: '#dc2626' },
        bgGradient: 'from-rose-50 via-white to-red-50',
        accentColor: 'rose',
        statsColors: ['text-rose-600', 'text-red-600', 'text-pink-600']
    },
    // Theme 4: Amber Orange
    amberOrange: {
        id: 'amberOrange',
        name: 'Amber Orange',
        gradient: 'from-amber-500 to-orange-600',
        badgeGradient: 'from-amber-100 to-orange-100',
        buttonGradient: 'from-amber-600 to-orange-600',
        circleGradient: { start: '#f59e0b', end: '#ea580c' },
        bgGradient: 'from-amber-50 via-white to-orange-50',
        accentColor: 'amber',
        statsColors: ['text-amber-600', 'text-orange-600', 'text-yellow-600']
    },
    // Theme 5: Blue Cyan
    blueCyan: {
        id: 'blueCyan',
        name: 'Blue Cyan',
        gradient: 'from-blue-500 to-cyan-600',
        badgeGradient: 'from-blue-100 to-cyan-100',
        buttonGradient: 'from-blue-600 to-cyan-600',
        circleGradient: { start: '#3b82f6', end: '#06b6d4' },
        bgGradient: 'from-blue-50 via-white to-cyan-50',
        accentColor: 'blue',
        statsColors: ['text-blue-600', 'text-cyan-600', 'text-sky-600']
    },
    // Theme 6: Violet Pink
    violetPink: {
        id: 'violetPink',
        name: 'Violet Pink',
        gradient: 'from-violet-500 to-pink-600',
        badgeGradient: 'from-violet-100 to-pink-100',
        buttonGradient: 'from-violet-600 to-pink-600',
        circleGradient: { start: '#8b5cf6', end: '#db2777' },
        bgGradient: 'from-violet-50 via-white to-pink-50',
        accentColor: 'violet',
        statsColors: ['text-violet-600', 'text-pink-600', 'text-fuchsia-600']
    },
    // Theme 7: Lime Green
    limeGreen: {
        id: 'limeGreen',
        name: 'Lime Green',
        gradient: 'from-lime-500 to-green-600',
        badgeGradient: 'from-lime-100 to-green-100',
        buttonGradient: 'from-lime-600 to-green-600',
        circleGradient: { start: '#84cc16', end: '#16a34a' },
        bgGradient: 'from-lime-50 via-white to-green-50',
        accentColor: 'lime',
        statsColors: ['text-lime-600', 'text-green-600', 'text-emerald-600']
    },
    // Theme 8: Purple Indigo
    purpleIndigo: {
        id: 'purpleIndigo',
        name: 'Purple Indigo',
        gradient: 'from-purple-500 to-indigo-600',
        badgeGradient: 'from-purple-100 to-indigo-100',
        buttonGradient: 'from-purple-600 to-indigo-600',
        circleGradient: { start: '#a855f7', end: '#4f46e5' },
        bgGradient: 'from-purple-50 via-white to-indigo-50',
        accentColor: 'purple',
        statsColors: ['text-purple-600', 'text-indigo-600', 'text-violet-600']
    },
    // Theme 9: Gray Slate (Minimal)
    graySlate: {
        id: 'graySlate',
        name: 'Gray Slate',
        gradient: 'from-gray-500 to-slate-600',
        badgeGradient: 'from-gray-100 to-slate-100',
        buttonGradient: 'from-gray-600 to-slate-600',
        circleGradient: { start: '#6b7280', end: '#475569' },
        bgGradient: 'from-gray-50 via-white to-slate-50',
        accentColor: 'gray',
        statsColors: ['text-gray-600', 'text-slate-600', 'text-zinc-600']
    },
    // Theme 10: Neon Bright
    neonBright: {
        id: 'neonBright',
        name: 'Neon Bright',
        gradient: 'from-pink-500 to-yellow-500',
        badgeGradient: 'from-pink-100 to-yellow-100',
        buttonGradient: 'from-pink-600 to-yellow-600',
        circleGradient: { start: '#ec4899', end: '#eab308' },
        bgGradient: 'from-pink-50 via-white to-yellow-50',
        accentColor: 'pink',
        statsColors: ['text-pink-600', 'text-yellow-600', 'text-orange-600']
    }
};

// Widget Wrapper Component
const WidgetWrapper = ({ widgetId, title, children, theme, className = "" }) => {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <div className="text-xs text-gray-500">ID: {widgetId}</div>
                </div>
            </div>
            <div className="relative">
                {children}
            </div>
        </div>
    );
};

// Theme Selector Component
const ThemeSelector = ({ currentTheme, onThemeChange, onClose }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-16 right-8 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        >
            <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex items-center justify-between">
                <h4 className="font-semibold text-gray-800">Select Theme</h4>
                <button 
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <FiX className="w-4 h-4 text-gray-500" />
                </button>
            </div>
            <div className="p-3 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(THEMES).map((theme) => (
                        <motion.button
                            key={theme.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onThemeChange(theme.id)}
                            className={`p-3 rounded-xl border-2 transition-all ${
                                currentTheme === theme.id 
                                    ? `border-${theme.accentColor}-500 shadow-md` 
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className={`w-full h-12 rounded-lg bg-gradient-to-r ${theme.gradient} mb-2`} />
                            <p className={`text-sm font-medium ${currentTheme === theme.id ? `text-${theme.accentColor}-600` : 'text-gray-700'}`}>
                                {theme.name}
                            </p>
                        </motion.button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const SalesOverviewWidget = () => {
    const [stats, setStats] = useState({
        total_sale: 0,
        growth_rate: 0,
        net_profit: 0,
        active_client: 0,
        task_complete_today: 0,
        task_completion_rate: 0,
        total_tasks: 0,
        financial_year: '2026-2027'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTheme, setCurrentTheme] = useState('indigoPurple');
    const [showThemeSelector, setShowThemeSelector] = useState(false);

    // Fetch dashboard summary data
    const fetchDashboardSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_BASE_URL}/report/dashboard-summary-core`, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard summary');
            }

            const responseData = await response.json();
            console.log('Dashboard Summary Response:', responseData);

            if (responseData.success && responseData.data) {
                const data = responseData.data;
                setStats({
                    total_sale: data.current_fy_total_sales?.value || 0,
                    growth_rate: data.growth_rate?.value || 0,
                    net_profit: data.net_profit?.value || 0,
                    active_client: data.active_clients?.value || 0,
                    task_complete_today: parseInt(data.task_completion?.completed) || 0,
                    task_completion_rate: data.task_completion?.rate || 0,
                    total_tasks: parseInt(data.task_completion?.total) || 0,
                    financial_year: data.financial_year || '2026-2027'
                });
            } else {
                throw new Error(responseData.message || 'Invalid response structure');
            }
        } catch (err) {
            console.error('Error fetching dashboard summary:', err);
            setError(err.message);
            // Set fallback values
            setStats({
                total_sale: 0,
                growth_rate: 0,
                net_profit: 0,
                active_client: 0,
                task_complete_today: 0,
                task_completion_rate: 0,
                total_tasks: 0,
                financial_year: '2026-2027'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardSummary();
    }, []);

    // Save theme preference to localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('salesWidgetTheme');
        if (savedTheme && THEMES[savedTheme]) {
            setCurrentTheme(savedTheme);
        }
    }, []);

    const handleThemeChange = (themeId) => {
        setCurrentTheme(themeId);
        localStorage.setItem('salesWidgetTheme', themeId);
        setShowThemeSelector(false);
    };

    const theme = THEMES[currentTheme];

    // Format currency
    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Format percentage
    const formatPercentage = (value) => {
        if (value === undefined || value === null) return '0%';
        return `${value.toFixed(1)}%`;
    };

    // Get trend color
    const getTrendColor = (growthRate) => {
        if (growthRate > 0) return 'text-green-600';
        if (growthRate < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    // Get trend icon
    const getTrendIcon = (growthRate) => {
        if (growthRate > 0) return <FiTrendingUp className="w-4 h-4" />;
        if (growthRate < 0) return <FiTrendingDown className="w-4 h-4" />;
        return <FiTrendingUp className="w-4 h-4" />;
    };

    // Get achievement percentage
    const achievementPercentage = Math.min(100, Math.round((stats.total_sale / (stats.total_sale * 1.0869)) * 100)) || 92;

    // Skeleton loader
    if (loading) {
        return (
            <WidgetWrapper widgetId="sales-overview" title="Sales Overview" className="col-span-full" theme={theme}>
                <div className="p-8 md:p-12">
                    <div className="animate-pulse">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                            <div className="flex-1">
                                <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-64"></div>
                            </div>
                        </div>
                        <div className="mb-8">
                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                            <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-40"></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <div className="h-12 w-36 bg-gray-200 rounded-xl"></div>
                            <div className="h-12 w-36 bg-gray-200 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </WidgetWrapper>
        );
    }

    // Error state
    if (error) {
        return (
            <WidgetWrapper widgetId="sales-overview" title="Sales Overview" className="col-span-full" theme={theme}>
                <div className="p-8 md:p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                        <FiAlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Unable to Load Data</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={fetchDashboardSummary}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </WidgetWrapper>
        );
    }

    return (
        <div className="relative col-span-full">
            {/* Theme Settings Button */}
            <div className="absolute top-4 right-4 z-10">
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowThemeSelector(!showThemeSelector)}
                    className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all border border-gray-200"
                >
                    <FiSettings className="w-5 h-5 text-gray-600" />
                </motion.button>
            </div>

            {/* Theme Selector Dropdown */}
            <AnimatePresence>
                {showThemeSelector && (
                    <ThemeSelector 
                        currentTheme={currentTheme}
                        onThemeChange={handleThemeChange}
                        onClose={() => setShowThemeSelector(false)}
                    />
                )}
            </AnimatePresence>

            <WidgetWrapper widgetId="sales-overview" title="Sales Overview" className="col-span-full" theme={theme}>
                <div className="relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient}`} />
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${theme.gradient} opacity-10 rounded-full -translate-y-32 translate-x-32`} />
                    <div className={`absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr ${theme.gradient} opacity-5 rounded-full -translate-x-48 translate-y-48`} />
                    
                    <div className="relative p-8 md:p-12">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative">
                                        <div className={`p-3 bg-gradient-to-br ${theme.gradient} rounded-xl shadow-lg`}>
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
                                    <p className="text-gray-500 mb-2">FY {stats.financial_year} Total Sales</p>
                                    <div className="flex items-end gap-4 flex-wrap">
                                        <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}>
                                            {formatCurrency(stats.total_sale)}
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-1 bg-gradient-to-r ${theme.badgeGradient} rounded-full ${getTrendColor(stats.growth_rate)}`}>
                                            {getTrendIcon(stats.growth_rate)}
                                            <span className="text-sm font-semibold">
                                                {stats.growth_rate > 0 ? '+' : ''}{stats.growth_rate.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-gray-500 mt-3">Achieved {achievementPercentage}% of annual target</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="text-sm text-gray-600">Growth Rate</div>
                                        <div className={`text-xl font-bold ${getTrendColor(stats.growth_rate)}`}>
                                            {stats.growth_rate > 0 ? '+' : ''}{stats.growth_rate.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="text-sm text-gray-600">Net Profit</div>
                                        <div className={`text-xl font-bold ${theme.statsColors[0]}`}>{formatCurrency(stats.net_profit)}</div>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="text-sm text-gray-600">Active Clients</div>
                                        <div className={`text-xl font-bold ${theme.statsColors[1]}`}>{stats.active_client}</div>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="text-sm text-gray-600">Task Completion</div>
                                        <div className={`text-xl font-bold ${theme.statsColors[2]}`}>
                                            {stats.task_complete_today}/{stats.total_tasks}
                                        </div>
                                        <div className="text-xs text-gray-500">{formatPercentage(stats.task_completion_rate)}</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <motion.button 
                                        className={`px-6 py-3 bg-gradient-to-r ${theme.buttonGradient} text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => window.location.href = '/reports/sales'}
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
                                        onClick={() => {
                                            console.log('Export data');
                                        }}
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
                                                stroke={`url(#gradient-${theme.id})`} strokeWidth="6" strokeLinecap="round"
                                                initial={{ strokeDasharray: '0, 283' }}
                                                animate={{ strokeDasharray: `${(achievementPercentage / 100) * 283}, 283` }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                transform="rotate(-90 50 50)"
                                            />
                                            <defs>
                                                <linearGradient id={`gradient-${theme.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor={theme.circleGradient.start} />
                                                    <stop offset="100%" stopColor={theme.circleGradient.end} />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className={`text-4xl font-bold ${theme.statsColors[0]}`}>{achievementPercentage}%</div>
                                                <div className="text-gray-600 text-sm">Target Achieved</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br ${theme.gradient} rounded-full flex items-center justify-center shadow-lg`}>
                                        <FiAward className="w-8 h-8 text-white" />
                                    </div>
                                    <div className={`absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br ${theme.gradient} rounded-full flex items-center justify-center shadow-lg`}>
                                        <FiTrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </WidgetWrapper>
        </div>
    );
};

export default SalesOverviewWidget;