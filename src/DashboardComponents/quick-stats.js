import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiTrendingUp,
    FiUsers,
    FiUserCheck,
    FiShoppingCart,
    FiCreditCard,
    FiDollarSign,
    FiCalendar,
    FiMove,
    FiEye,
    FiEyeOff,
    FiTrash2,
    FiCheck,
    FiX,
    FiShoppingBag,
    FiUserPlus,
    FiCheckCircle,
    FiClock,
    FiChevronUp,
    FiChevronDown,
    FiMinus,
    FiMaximize2,
    FiDollarSign as FiMoney
} from 'react-icons/fi';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const QuickStats = ({
    stats: propStats = {},
    isCustomizing = false,
    onCardDragStart,
    onCardDragOver,
    onCardDrop,
    onCardDragEnd,
    draggedCard = null,
    dragOverCard = null,
    formatCurrency,
    formatNumber,
    blurEnabled = false,
    onNavigate,
    quickStatsCards = [],
    setQuickStatsCards,
    onRefresh
}) => {
    const [localCards, setLocalCards] = useState(quickStatsCards);
    const [collapsedCards, setCollapsedCards] = useState(() => {
        const saved = localStorage.getItem('quickStatsCollapsedCards');
        return saved ? JSON.parse(saved) : {};
    });
    const [apiStats, setApiStats] = useState({});
    const [loading, setLoading] = useState(false);

    // Fetch quick stats from API
    const fetchQuickStats = useCallback(async () => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const response = await fetch(`${API_BASE_URL}/report/dashboard/quick-stats`, {
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
                // Transform API data to include both count and amount
                const transformedStats = {
                    pending_billing: {
                        count: result.data.pending_billing?.count || 0,
                        amount: 0
                    },
                    creditor: {
                        count: result.data.creditors?.count || 0,
                        amount: result.data.creditors?.total_amount || 0
                    },
                    debtor: {
                        count: result.data.debtors?.count || 0,
                        amount: result.data.debtors?.total_amount || 0
                    },
                    today_received: {
                        count: result.data.today_received?.count || 0,
                        amount: result.data.today_received?.total_amount || 0
                    },
                    today_payment: {
                        count: result.data.today_payment?.count || 0,
                        amount: result.data.today_payment?.total_amount || 0
                    },
                    today_birthday: {
                        count: result.data.today_birthday?.count || 0,
                        amount: 0
                    },
                    _raw: result.data
                };
                setApiStats(transformedStats);
            } else {
                throw new Error(result.message || 'Failed to fetch quick stats');
            }
        } catch (err) {
            console.error('Quick Stats API Error:', err);
            // Fallback to prop stats if API fails
            setApiStats({
                pending_billing: { count: propStats.pending_for_billing || 0, amount: 0 },
                creditor: { count: 0, amount: propStats.creditor || 0 },
                debtor: { count: 0, amount: propStats.debtor || 0 },
                today_received: { count: 0, amount: propStats.today_received || 0 },
                today_payment: { count: 0, amount: propStats.today_payment || 0 },
                today_birthday: { count: propStats.today_birthday || 0, amount: 0 },
            });
        } finally {
            setLoading(false);
        }
    }, [propStats]);

    // Initial fetch
    useEffect(() => {
        fetchQuickStats();
    }, [fetchQuickStats]);

    // Update local cards when prop changes
    useEffect(() => {
        setLocalCards(quickStatsCards);
    }, [quickStatsCards]);

    // Save collapsed state to localStorage
    useEffect(() => {
        localStorage.setItem('quickStatsCollapsedCards', JSON.stringify(collapsedCards));
    }, [collapsedCards]);

    // Handle card collapse/expand
    const toggleCardCollapse = useCallback((cardId, e) => {
        e.stopPropagation();
        setCollapsedCards(prev => ({
            ...prev,
            [cardId]: !prev[cardId]
        }));
    }, []);

    // Collapse all cards
    const collapseAllCards = useCallback(() => {
        const allCollapsed = {};
        localCards.forEach(card => {
            allCollapsed[card.id] = true;
        });
        setCollapsedCards(allCollapsed);
    }, [localCards]);

    // Expand all cards
    const expandAllCards = useCallback(() => {
        setCollapsedCards({});
    }, []);

    // Handle card reordering
    const handleCardDropInternal = useCallback((e, targetCardId, source) => {
        if (!isCustomizing) return;
        
        if (draggedCard !== targetCardId) {
            const draggedIndex = localCards.findIndex(c => c.id === draggedCard);
            const targetIndex = localCards.findIndex(c => c.id === targetCardId);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const newCards = [...localCards];
                const [removed] = newCards.splice(draggedIndex, 1);
                newCards.splice(targetIndex, 0, removed);
                setLocalCards(newCards);
                if (setQuickStatsCards) {
                    setQuickStatsCards(newCards);
                }
            }
        }
        if (onCardDragEnd) onCardDragEnd();
    }, [isCustomizing, draggedCard, localCards, setQuickStatsCards, onCardDragEnd]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        fetchQuickStats();
        if (onRefresh) {
            onRefresh();
        }
    }, [fetchQuickStats, onRefresh]);

    // Handle card click navigation
    const handleCardClick = useCallback((card, e) => {
        if (isCustomizing) return;
        
        // Don't navigate if clicking on collapse button
        if (e.target.closest('button')) return;
        
        if (onNavigate && card.link) {
            onNavigate(card.link);
        }
    }, [isCustomizing, onNavigate]);

    // Calculate allCollapsed for UI state
    const allCollapsed = localCards.length > 0 && 
                         Object.keys(collapsedCards).length === localCards.length && 
                         localCards.every(card => collapsedCards[card.id] === true);

    // Combine stats from API and props (API takes precedence)
    const getStatValue = (statKey) => {
        const apiStat = apiStats[statKey];
        if (apiStat) {
            return apiStat;
        }
        // Fallback to prop stats
        const propValue = propStats[statKey];
        if (typeof propValue === 'object') {
            return propValue;
        }
        return { count: 0, amount: propValue || 0 };
    };

    // Individual Card Component
    const CardComponent = React.memo(({ card, index }) => {
        const statData = getStatValue(card.value);
        const count = statData.count || 0;
        const amount = statData.amount || 0;
        const IconComponent = card.icon;
        const isDragged = draggedCard === card.id;
        const isDragOver = dragOverCard === card.id;
        const isCollapsed = collapsedCards[card.id] || false;
        
        // Determine if this card should show amount (has amount data)
        const showAmount = card.showAmount !== undefined ? card.showAmount : (amount > 0 || card.alwaysShowAmount);
        // Determine if this card should show count
        const showCount = card.showCount !== undefined ? card.showCount : true;

        return (
            <div
                draggable={isCustomizing}
                onDragStart={(e) => onCardDragStart && onCardDragStart(e, card.id, 'quickStats')}
                onDragOver={(e) => onCardDragOver && onCardDragOver(e, card.id, 'quickStats')}
                onDrop={(e) => handleCardDropInternal(e, card.id, 'quickStats')}
                onDragEnd={onCardDragEnd}
                onClick={(e) => handleCardClick(card, e)}
                className={`relative ${isCustomizing ? 'cursor-move select-none' : 'cursor-pointer'} ${
                    isDragged ? 'opacity-50' : ''
                } ${isDragOver ? 'scale-105 transition-transform duration-200' : ''}`}
                style={{ 
                    pointerEvents: isCustomizing ? 'auto' : 'auto',
                    userSelect: isCustomizing ? 'none' : 'auto'
                }}
            >
                {/* Drag indicator */}
                {isCustomizing && (
                    <div className="absolute -top-2 -left-2 z-10 pointer-events-none">
                        <div className="p-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg">
                            <FiMove className="w-3 h-3 text-white" />
                        </div>
                    </div>
                )}

                <motion.div 
                    className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 h-full`}
                    style={{ background: card.gradient }}
                    whileHover={{ 
                        scale: isCustomizing ? 1 : 1.02,
                        y: isCustomizing ? 0 : -2,
                        transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                                <div className="text-white/80 text-sm font-medium mb-1 flex items-center gap-2 flex-wrap">
                                    {card.title}
                                    {!isCustomizing && (
                                        <button
                                            onClick={(e) => toggleCardCollapse(card.id, e)}
                                            className="p-1 hover:bg-white/20 rounded-lg transition-all duration-200 flex-shrink-0"
                                        >
                                            {isCollapsed ? (
                                                <FiChevronDown className="w-4 h-4 text-white/70" />
                                            ) : (
                                                <FiChevronUp className="w-4 h-4 text-white/70" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                <AnimatePresence mode="wait">
                                    {!isCollapsed && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {loading ? (
                                                <div className="space-y-2">
                                                    <div className="animate-pulse h-6 bg-white/20 rounded w-24"></div>
                                                    <div className="animate-pulse h-4 bg-white/20 rounded w-16"></div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {/* Count - always show with 0 entries if no data */}
                                                    {showCount && (
                                                        <div>
                                                            <div className={`text-2xl font-bold text-white ${blurEnabled ? 'blur-sm' : ''}`}>
                                                                {formatNumber(count)}
                                                            </div>
                                                            <div className="text-white/60 text-xs mt-0.5">
                                                                {count === 1 ? 'entry' : 'entries'}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Amount */}
                                                    {showAmount && amount > 0 && (
                                                        <div>
                                                            <div className={`text-xl font-semibold text-white/90 ${blurEnabled ? 'blur-sm' : ''}`}>
                                                                {formatCurrency(amount)}
                                                            </div>
                                                            <div className="text-white/60 text-xs mt-0.5">
                                                                amount
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl flex-shrink-0 ml-3">
                                {IconComponent && <IconComponent className="w-6 h-6 text-white" />}
                            </div>
                        </div>
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex gap-3 text-white/60 text-xs">
                                            {showCount && <span>Total Count</span>}
                                            {showAmount && amount > 0 && <span>Total Amount</span>}
                                        </div>
                                        {isCustomizing ? (
                                            <div className="p-1 bg-white/30 rounded-lg">
                                                <FiMove className="w-3 h-3 text-white" />
                                            </div>
                                        ) : (
                                            <div className="text-white/70 text-xs">
                                                View Details →
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                </motion.div>
            </div>
        );
    });

    CardComponent.displayName = 'CardComponent';

    // Default cards configuration with both count and amount
    const defaultCards = [
        { 
            id: 'pending-billing', 
            title: 'Pending Billing', 
            value: 'pending_billing', 
            icon: FiShoppingBag, 
            color: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            link: '/quick-stats/pending-billing', 
            showCount: true,
            showAmount: false,
            alwaysShowCount: true
        },
        { 
            id: 'creditors', 
            title: 'Creditors', 
            value: 'creditor', 
            icon: FiUsers, 
            color: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white',
            gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            link: '/quick-stats/creditors', 
            showCount: true,
            showAmount: true,
            alwaysShowAmount: true
        },
        { 
            id: 'debtors', 
            title: 'Debtors', 
            value: 'debtor', 
            icon: FiShoppingCart, 
            color: 'bg-gradient-to-br from-red-500 to-pink-600 text-white',
            gradient: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
            link: '/quick-stats/debtors', 
            showCount: true,
            showAmount: true,
            alwaysShowAmount: true
        },
        { 
            id: 'today-received', 
            title: 'Today Received', 
            value: 'today_received', 
            icon: FiDollarSign, 
            color: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            link: '/quick-stats/today-received', 
            showCount: true,
            showAmount: true,
            alwaysShowAmount: true
        },
        { 
            id: 'today-payment', 
            title: 'Today Payment', 
            value: 'today_payment', 
            icon: FiCreditCard, 
            color: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white',
            gradient: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
            link: '/quick-stats/today-payment', 
            showCount: true,
            showAmount: true,
            alwaysShowAmount: true
        },
        { 
            id: 'today-birthday', 
            title: 'Today Birthday', 
            value: 'today_birthday', 
            icon: FiCalendar, 
            color: 'bg-gradient-to-br from-purple-500 to-violet-600 text-white',
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            link: '/quick-stats/today-birthday', 
            showCount: true,
            showAmount: false,
            alwaysShowCount: true
        }
    ];

    const cardsToRender = localCards.length > 0 ? localCards : defaultCards;

    return (
        <div className="w-full relative">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex-shrink-0">
                    <FiTrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Quick Stats</h3>
                {!isCustomizing && (
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={allCollapsed ? expandAllCards : collapseAllCards}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200"
                            title={allCollapsed ? "Expand all cards" : "Collapse all cards"}
                        >
                            {allCollapsed ? (
                                <FiMaximize2 className="w-3 h-3" />
                            ) : (
                                <FiMinus className="w-3 h-3" />
                            )}
                            <span>{allCollapsed ? "Expand All" : "Collapse All"}</span>
                        </button>
                        <button
                            onClick={handleRefresh}
                            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                            title="Refresh stats"
                            disabled={loading}
                        >
                            <FiClock className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                )}
                {isCustomizing && (
                    <div className="ml-auto text-xs px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full">
                        Drag cards to reorder
                    </div>
                )}
            </div>
            
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl z-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            )}
            
            {/* Grid with proper gap and equal height cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr relative">
                {cardsToRender.map((card, index) => (
                    <CardComponent key={card.id} card={card} index={index} />
                ))}
            </div>
        </div>
    );
};

export default QuickStats;