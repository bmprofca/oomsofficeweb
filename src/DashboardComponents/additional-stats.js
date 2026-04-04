import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FiGrid,
    FiUsers,
    FiUserPlus,
    FiCheckCircle,
    FiTrendingUp,
    FiUserCheck,
    FiPlus,
    FiMove,
    FiDollarSign,
    FiAlertCircle,
    FiRefreshCw,
    FiClock,
    FiCalendar,
    FiBarChart2,
    FiPieChart,
    FiFileText,
    FiCreditCard
} from 'react-icons/fi';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

// Main Stat Card Component
const StatCard = ({ card, stats, isCustomizing, onDragStart, onDragOver, onDrop, onDragEnd, draggedCard, dragOverCard, draggedCardSource, formatCurrency, formatNumber, blurEnabled, onClick }) => {
    const value = stats[card.value] || 0;
    const IconComponent = card.icon;
    const isDragged = draggedCard === card.id && draggedCardSource === 'additionalStats';
    const isDragOver = dragOverCard === card.id && draggedCardSource === 'additionalStats';

    return (
        <div
            draggable={isCustomizing}
            onDragStart={(e) => onDragStart(e, card.id, 'additionalStats')}
            onDragOver={(e) => onDragOver(e, card.id, 'additionalStats')}
            onDrop={(e) => onDrop(e, card.id, 'additionalStats')}
            onDragEnd={onDragEnd}
            onClick={() => !isCustomizing && onClick && onClick(card.link)}
            className={`relative ${isCustomizing ? 'cursor-move select-none' : 'cursor-pointer'} ${
                isDragged ? 'opacity-50' : ''
            } ${isDragOver ? 'scale-105 transition-transform duration-200' : ''}`}
        >
            {isCustomizing && (
                <div className="absolute -top-2 -left-2 z-10">
                    <div className="p-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg">
                        <FiMove className="w-3 h-3 text-white" />
                    </div>
                </div>
            )}

            <motion.div 
                className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
                style={{ background: card.gradient }}
                whileHover={{ 
                    scale: isCustomizing ? 1 : 1.03,
                    y: isCustomizing ? 0 : -5,
                }}
                whileTap={{ scale: 0.98 }}
            >
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="text-white/80 text-sm font-medium mb-1">
                                {card.title}
                            </div>
                            <div className={`text-2xl font-bold text-white mb-2 ${blurEnabled ? 'blur-sm' : ''}`}>
                                {card.isCurrency ? formatCurrency(value) : formatNumber(value)}
                            </div>
                        </div>
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                            {IconComponent && <IconComponent className="w-6 h-6 text-white" />}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-white/70 text-xs">
                            {card.isCurrency ? 'Total Amount' : 'Total Count'}
                        </span>
                        {!isCustomizing && (
                            <div className="text-white/70 text-xs group-hover:translate-x-1 transition-transform">
                                View Details →
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            </motion.div>
        </div>
    );
};

// Additional Metrics Card Component
const AdditionalMetricsCard = ({ title, icon: Icon, children, gradient }) => (
    <motion.div 
        className="rounded-2xl shadow-lg overflow-hidden bg-white"
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
        <div className={`p-4 ${gradient}`}>
            <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-white" />
                <h4 className="text-white font-semibold">{title}</h4>
            </div>
        </div>
        <div className="p-4">
            {children}
        </div>
    </motion.div>
);

// Loading Skeleton
const LoadingSkeleton = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-100 animate-pulse">
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded w-32"></div>
                            </div>
                            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-64"></div>
            ))}
        </div>
    </div>
);

// Error State
const ErrorState = ({ message, onRetry }) => (
    <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <FiAlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard Data</h3>
        <p className="text-gray-600 mb-4">{message || 'Unable to fetch dashboard statistics. Please try again.'}</p>
        <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
            <FiRefreshCw className="w-4 h-4" />
            Retry
        </button>
    </div>
);

// Main Component
const AdditionalStatsComponent = ({ 
    stats: externalStats,
    isCustomizing = false,
    onCardDragStart = () => {},
    onCardDragOver = () => {},
    onCardDrop = () => {},
    onCardDragEnd = () => {},
    draggedCard = null,
    dragOverCard = null,
    formatCurrency = (value) => {
        const amount = parseFloat(value) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    },
    formatNumber = (value) => {
        const num = parseInt(value) || 0;
        return new Intl.NumberFormat('en-IN').format(num);
    },
    blurEnabled = false,
    onNavigate = (link) => window.location.href = link
}) => {
    const [stats, setStats] = useState(externalStats || {});
    const [additionalMetrics, setAdditionalMetrics] = useState(null);
    const [loading, setLoading] = useState(!externalStats);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [reportDate, setReportDate] = useState(null);
    const [calculationNote, setCalculationNote] = useState(null);

    // Default cards configuration
    const defaultCards = [
        { 
            id: 'total-client', 
            title: 'Total Clients', 
            value: 'total_client', 
            icon: FiUsers, 
            gradient: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
            link: '/view-client',
            isCurrency: false
        },
        { 
            id: 'new-client', 
            title: 'New Clients', 
            value: 'new_client', 
            icon: FiUserPlus, 
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            link: '/view-new-client',
            isCurrency: false
        },
        { 
            id: 'active-client', 
            title: 'Active Clients', 
            value: 'active_client', 
            icon: FiCheckCircle, 
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            link: '/view-active-client',
            isCurrency: false
        },
        { 
            id: 'net-profit', 
            title: 'Net Profit', 
            value: 'net_profit', 
            icon: FiTrendingUp, 
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            link: '/view-finance-report',
            isCurrency: true
        },
        { 
            id: 'total-staff', 
            title: 'Total Staff', 
            value: 'total_staff', 
            icon: FiUsers, 
            gradient: 'linear-gradient(135deg, #ef4444 0%, #e11d48 100%)',
            link: '/view-stuff',
            isCurrency: false
        },
        { 
            id: 'present-today', 
            title: 'Present Today', 
            value: 'present_today', 
            icon: FiUserCheck, 
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            link: '/attendance',
            isCurrency: false
        },
        { 
            id: 'task-create-today', 
            title: 'Tasks Created', 
            value: 'task_created_today', 
            icon: FiPlus, 
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            link: '/view-task-create-today',
            isCurrency: false
        },
        { 
            id: 'task-complete-today', 
            title: 'Tasks Completed', 
            value: 'task_completed_today', 
            icon: FiCheckCircle, 
            gradient: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
            link: '/view-task-complete-today',
            isCurrency: false
        }
    ];

    const [cards, setCards] = useState(() => {
        const savedCards = localStorage.getItem('additionalStatsCards');
        if (savedCards) {
            try {
                return JSON.parse(savedCards);
            } catch (e) {
                return defaultCards;
            }
        }
        return defaultCards;
    });

    // Fetch dashboard data from API
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
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
                setAdditionalMetrics(result.data.additional_metrics);
                setReportDate(result.report_date);
                setCalculationNote(result.calculation_note);
                setLastUpdated(new Date());
                
                // Store full data in localStorage
                localStorage.setItem('dashboardFullData', JSON.stringify(result));
            } else {
                throw new Error(result.message || 'Failed to fetch dashboard data');
            }
        } catch (err) {
            console.error('Dashboard API Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial data fetch
    useEffect(() => {
        if (!externalStats) {
            fetchDashboardData();
        } else {
            setStats(externalStats);
            setLoading(false);
        }
    }, [externalStats]);

    // Save cards to localStorage
    useEffect(() => {
        if (!isCustomizing && cards.length > 0) {
            localStorage.setItem('additionalStatsCards', JSON.stringify(cards));
        }
    }, [cards, isCustomizing]);

    // Handle card reordering
    const handleCardDrop = (e, targetCardId, source) => {
        if (source !== 'additionalStats') return;
        
        if (draggedCard && draggedCard !== targetCardId) {
            const draggedIndex = cards.findIndex(c => c.id === draggedCard);
            const targetIndex = cards.findIndex(c => c.id === targetCardId);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const newCards = [...cards];
                const [removed] = newCards.splice(draggedIndex, 1);
                newCards.splice(targetIndex, 0, removed);
                setCards(newCards);
            }
        }
        
        onCardDrop(e, targetCardId, source);
    };

    const handleCardClick = (link) => {
        if (onNavigate) {
            onNavigate(link);
        } else if (window.location) {
            window.location.href = link;
        }
    };

    if (loading) return <div className="p-6"><LoadingSkeleton /></div>;
    if (error && (!stats || Object.keys(stats).length === 0)) {
        return (
            <div className="p-6">
                <ErrorState message={error} onRetry={fetchDashboardData} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                        <FiGrid className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Dashboard Statistics</h3>
                        {reportDate && (
                            <p className="text-xs text-gray-500 mt-1">
                                Report Date: {new Date(reportDate).toLocaleDateString('en-IN')}
                                {lastUpdated && ` | Last Updated: ${lastUpdated.toLocaleTimeString()}`}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!externalStats && (
                        <button
                            onClick={fetchDashboardData}
                            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-100"
                            title="Refresh data"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                    {isCustomizing && (
                        <div className="text-xs px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full font-medium">
                            Drag & Drop to Reorder Cards
                        </div>
                    )}
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => (
                    <StatCard
                        key={card.id}
                        card={card}
                        stats={stats}
                        isCustomizing={isCustomizing}
                        onDragStart={onCardDragStart}
                        onDragOver={onCardDragOver}
                        onDrop={handleCardDrop}
                        onDragEnd={onCardDragEnd}
                        draggedCard={draggedCard}
                        dragOverCard={dragOverCard}
                        draggedCardSource="additionalStats"
                        formatCurrency={formatCurrency}
                        formatNumber={formatNumber}
                        blurEnabled={blurEnabled}
                        onClick={handleCardClick}
                    />
                ))}
            </div>

            {/* Additional Metrics Section */}
            {additionalMetrics && (
                <>
                    <div className="flex items-center gap-3 mt-8 mb-4">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
                            <FiBarChart2 className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Additional Insights</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Task Metrics */}
                        <AdditionalMetricsCard 
                            title="Task Analytics" 
                            icon={FiCheckCircle}
                            gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
                        >
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-gray-600">Pending Tasks</span>
                                    <span className="text-2xl font-bold text-orange-600">
                                        {formatNumber(additionalMetrics.pending_tasks)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-gray-600">Overdue Tasks</span>
                                    <span className="text-2xl font-bold text-red-600">
                                        {formatNumber(additionalMetrics.overdue_tasks)}
                                    </span>
                                </div>
                                {additionalMetrics.task_status_breakdown && (
                                    <div className="mt-3 pt-2">
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Status Breakdown:</p>
                                        <div className="space-y-2">
                                            {Object.entries(additionalMetrics.task_status_breakdown).map(([status, count]) => (
                                                <div key={status} className="flex justify-between text-sm">
                                                    <span className="text-gray-500 capitalize">{status}:</span>
                                                    <span className="font-medium">{formatNumber(count)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AdditionalMetricsCard>

                        {/* Financial Metrics */}
                        <AdditionalMetricsCard 
                            title="Financial Overview" 
                            icon={FiDollarSign}
                            gradient="bg-gradient-to-r from-green-500 to-emerald-600"
                        >
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-gray-600">Today's Income</span>
                                    <span className="text-2xl font-bold text-green-600">
                                        {formatCurrency(additionalMetrics.total_income_today)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-gray-600">Today's Expense</span>
                                    <span className="text-2xl font-bold text-red-600">
                                        {formatCurrency(additionalMetrics.total_expense_today)}
                                    </span>
                                </div>
                                {additionalMetrics.transaction_breakdown && (
                                    <div className="mt-3 pt-2">
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Transaction Breakdown:</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-green-50 p-2 rounded-lg">
                                                <p className="text-xs text-green-600">Credit</p>
                                                <p className="font-bold">{formatCurrency(additionalMetrics.transaction_breakdown.credit?.amount)}</p>
                                                <p className="text-xs text-gray-500">{formatNumber(additionalMetrics.transaction_breakdown.credit?.count)} transactions</p>
                                            </div>
                                            <div className="bg-red-50 p-2 rounded-lg">
                                                <p className="text-xs text-red-600">Debit</p>
                                                <p className="font-bold">{formatCurrency(additionalMetrics.transaction_breakdown.debit?.amount)}</p>
                                                <p className="text-xs text-gray-500">{formatNumber(additionalMetrics.transaction_breakdown.debit?.count)} transactions</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AdditionalMetricsCard>

                        {/* Billing Status */}
                        {additionalMetrics.billing_status_breakdown && (
                            <AdditionalMetricsCard 
                                title="Billing Status" 
                                icon={FiCreditCard}
                                gradient="bg-gradient-to-r from-purple-500 to-pink-600"
                            >
                                <div className="space-y-3">
                                    {Object.entries(additionalMetrics.billing_status_breakdown).map(([status, data]) => (
                                        <div key={status} className="border-b pb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-semibold text-gray-700 capitalize">{status}:</span>
                                                <span className="text-lg font-bold text-indigo-600">
                                                    {formatCurrency(data.amount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Count: {formatNumber(data.count)}</span>
                                                <span className="text-gray-500">
                                                    Avg: {formatCurrency(data.amount / data.count)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AdditionalMetricsCard>
                        )}
                    </div>
                </>
            )}

            {/* Calculation Note */}
            {calculationNote && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-start gap-2">
                        <FiAlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-blue-800">Information Note</p>
                            <p className="text-xs text-blue-600">{calculationNote}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdditionalStatsComponent;