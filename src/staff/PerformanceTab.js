import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const PerformanceTab = ({ variants, staffUsername }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [staffData, setStaffData] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    
    // Date state
    const [dateRange, setDateRange] = useState(() => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const fromDate = `${currentYear}-01-01`;
        const toDate = currentDate.toISOString().split('T')[0];
        return { fromDate, toDate };
    });

    // Quick date range options
    const quickRanges = [
        { label: 'This Year', getRange: () => {
            const year = new Date().getFullYear();
            return { fromDate: `${year}-01-01`, toDate: new Date().toISOString().split('T')[0] };
        }},
        { label: 'Last Year', getRange: () => {
            const year = new Date().getFullYear() - 1;
            return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
        }},
        { label: 'Last 30 Days', getRange: () => {
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 30);
            return { fromDate: fromDate.toISOString().split('T')[0], toDate: toDate.toISOString().split('T')[0] };
        }},
        { label: 'Last 90 Days', getRange: () => {
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 90);
            return { fromDate: fromDate.toISOString().split('T')[0], toDate: toDate.toISOString().split('T')[0] };
        }}
    ];

    useEffect(() => {
        if (staffUsername) {
            fetchPerformanceStats();
        }
    }, [staffUsername, dateRange]);

    const fetchPerformanceStats = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const headers = getHeaders();
            const url = `${API_BASE_URL}/report/staff-performance-stats?staff_username=${staffUsername}&from_date=${dateRange.fromDate}&to_date=${dateRange.toDate}&range=`;
            
            const response = await fetch(url, { headers });
            const result = await response.json();
            
            if (result.success) {
                setStaffData(result.data);
            } else {
                setError(result.message || 'Failed to fetch performance data');
            }
        } catch (err) {
            console.error('API Error:', err);
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    const applyQuickRange = (rangeFn) => {
        const newRange = rangeFn();
        setDateRange(newRange);
        setShowDatePicker(false);
    };

    // Colors for charts
    const COLORS = {
        completed: '#10b981',
        inProgress: '#3b82f6',
        pending: '#f59e0b',
        cancelled: '#ef4444',
        onTime: '#10b981',
        late: '#ef4444',
        revenue: ['#6366f1', '#8b5cf6', '#ec4899'],
        performanceGauge: {
            excellent: '#10b981',
            good: '#3b82f6',
            average: '#f59e0b',
            poor: '#ef4444'
        }
    };

    // Get color based on performance score
    const getPerformanceColor = (score) => {
        if (score >= 80) return COLORS.performanceGauge.excellent;
        if (score >= 60) return COLORS.performanceGauge.good;
        if (score >= 40) return COLORS.performanceGauge.average;
        return COLORS.performanceGauge.poor;
    };

    // Get rating description
    const getRatingDescription = (rating) => {
        const descriptions = {
            'Excellent': 'Outstanding performance exceeding expectations',
            'Good': 'Solid performance meeting all goals',
            'Average': 'Satisfactory performance with room for improvement',
            'Poor': 'Below expectations, needs immediate attention'
        };
        return descriptions[rating] || 'Performance needs review';
    };

    if (loading) {
        return (
            <motion.div
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex justify-center items-center h-96"
            >
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <div className="text-gray-500 text-sm">Loading performance data...</div>
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <motion.div
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex justify-center items-center h-96"
            >
                <div className="text-center">
                    <div className="text-red-500 text-sm mb-2">⚠️ {error}</div>
                    <button 
                        onClick={fetchPerformanceStats}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                        Try Again
                    </button>
                </div>
            </motion.div>
        );
    }

    if (!staffData || !staffData.staff_performance?.length) {
        return (
            <motion.div
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex justify-center items-center h-96"
            >
                <div className="text-center text-gray-400 text-sm">
                    No performance data available for selected period
                </div>
            </motion.div>
        );
    }

    const { period, team_summary, staff_performance } = staffData;
    const currentStaff = staff_performance[0];
    const taskSummary = currentStaff?.task_summary;
    const qualityMetrics = currentStaff?.quality_metrics;
    const revenueSummary = currentStaff?.revenue_summary;
    const performanceScore = currentStaff?.performance_score || 0;
    const performanceRating = currentStaff?.performance_rating || 'Average';

    // Prepare data for Task Status Pie Chart
    const taskStatusData = [
        { name: 'Completed', value: taskSummary?.total_completed || 0, color: COLORS.completed },
        { name: 'In Progress', value: taskSummary?.total_in_progress || 0, color: COLORS.inProgress },
        { name: 'Pending', value: taskSummary?.total_pending || 0, color: COLORS.pending },
        { name: 'Cancelled', value: taskSummary?.total_cancelled || 0, color: COLORS.cancelled }
    ].filter(item => item.value > 0);

    // Prepare data for Quality Metrics Pie Chart
    const qualityMetricsData = [
        { name: 'On Time', value: qualityMetrics?.on_time_completed || 0, color: COLORS.onTime },
        { name: 'Late', value: qualityMetrics?.late_completed || 0, color: COLORS.late }
    ].filter(item => item.value > 0);

    // Prepare data for Revenue Bar Chart
    const revenueData = [
        { name: 'Billed', amount: revenueSummary?.billed_revenue || 0, formatted: revenueSummary?.formatted_billed_revenue || '₹0' },
        { name: 'Unbilled', amount: revenueSummary?.unbilled_revenue || 0, formatted: revenueSummary?.formatted_unbilled_revenue || '₹0' }
    ];

    // Prepare data for Performance Score Gauge
    const performanceGaugeData = [
        {
            name: 'Performance Score',
            value: performanceScore,
            fill: getPerformanceColor(performanceScore)
        }
    ];

    // Prepare data for Performance Rating Breakdown
    const ratingBreakdownData = [
        { name: 'Score', value: performanceScore, fill: getPerformanceColor(performanceScore) },
        { name: 'Remaining', value: 100 - performanceScore, fill: '#e5e7eb' }
    ];

    // Custom Tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-sm text-gray-600">
                        Value: <span className="font-semibold">{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const RevenueTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-sm text-gray-600">
                        Amount: <span className="font-semibold">₹{payload[0].value.toLocaleString()}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const PerformanceTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">Performance Score</p>
                    <p className="text-2xl font-bold" style={{ color: getPerformanceColor(payload[0].value) }}>
                        {payload[0].value}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Rating: {performanceRating}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
        >
            {/* Header with Date Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-200">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Staff performance metrics and insights</p>
                </div>
                
                {/* Date Range Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{dateRange.fromDate} to {dateRange.toDate}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    <AnimatePresence>
                        {showDatePicker && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                            >
                                <div className="p-4">
                                    <div className="mb-4">
                                        <label className="text-xs font-medium text-gray-500 mb-2 block">Quick Select</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {quickRanges.map((range, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => applyQuickRange(range.getRange)}
                                                    className="text-xs px-2 py-1.5 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 transition-colors text-left"
                                                >
                                                    {range.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <label className="text-xs font-medium text-gray-500 block">Custom Range</label>
                                        <div>
                                            <input
                                                type="date"
                                                name="fromDate"
                                                value={dateRange.fromDate}
                                                onChange={handleDateChange}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="date"
                                                name="toDate"
                                                value={dateRange.toDate}
                                                onChange={handleDateChange}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowDatePicker(false)}
                                            className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Staff Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {currentStaff.staff_info?.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900">{currentStaff.staff_info?.name}</h4>
                            <p className="text-xs text-gray-600">{currentStaff.staff_info?.designation}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{taskSummary?.total_assigned || 0}</div>
                            <div className="text-xs text-gray-500">Total Tasks</div>
                        </div>
                        <div className="w-px bg-gray-300"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{taskSummary?.total_completed || 0}</div>
                            <div className="text-xs text-gray-500">Completed</div>
                        </div>
                        <div className="w-px bg-gray-300"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{performanceScore}</div>
                            <div className="text-xs text-gray-500">Score</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Score Gauge Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex-1 text-center lg:text-left">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Performance Score</h4>
                        <div className="mb-4">
                            <span className={`text-4xl font-bold`} style={{ color: getPerformanceColor(performanceScore) }}>
                                {performanceScore}%
                            </span>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {performanceRating}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">{getRatingDescription(performanceRating)}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Target: 100%</span>
                                <span className="text-gray-500">Current: {performanceScore}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${performanceScore}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-2 rounded-full"
                                    style={{ backgroundColor: getPerformanceColor(performanceScore) }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height={250}>
                            <RadialBarChart
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="90%"
                                barSize={20}
                                data={performanceGaugeData}
                                startAngle={180}
                                endAngle={0}
                            >
                                <RadialBar
                                    minAngle={15}
                                    background
                                    clockWise={true}
                                    dataKey="value"
                                    cornerRadius={10}
                                />
                                <Tooltip content={PerformanceTooltip} />
                                <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-3xl font-bold"
                                    fill={getPerformanceColor(performanceScore)}
                                >
                                    {performanceScore}%
                                </text>
                                <text
                                    x="50%"
                                    y="65%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-sm text-gray-500"
                                >
                                    Score
                                </text>
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Task Status Pie Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Task Status Distribution</h4>
                    {taskStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={taskStatusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {taskStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={CustomTooltip} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                            No task data available
                        </div>
                    )}
                </div>

                {/* Quality Metrics Pie Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Quality Metrics</h4>
                    {qualityMetricsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={qualityMetricsData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {qualityMetricsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={CustomTooltip} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                            No quality metrics available
                        </div>
                    )}
                </div>
            </div>

            {/* Revenue Bar Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Revenue Overview</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={RevenueTooltip} />
                        <Legend />
                        <Bar dataKey="amount" fill="#8884d8" radius={[8, 8, 0, 0]}>
                            {revenueData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS.revenue[index % COLORS.revenue.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Completion Rate</div>
                    <div className="text-2xl font-bold text-blue-600">{taskSummary?.completion_rate || 0}%</div>
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                        <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${taskSummary?.completion_rate || 0}%` }} />
                    </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">On-Time Rate</div>
                    <div className="text-2xl font-bold text-green-600">{qualityMetrics?.on_time_rate || 0}%</div>
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                        <div className="bg-green-500 h-1 rounded-full" style={{ width: `${qualityMetrics?.on_time_rate || 0}%` }} />
                    </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Performance Rating</div>
                    <div className="text-lg font-semibold" style={{ color: getPerformanceColor(performanceScore) }}>
                        {performanceRating}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Score: {performanceScore}</div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
                    <div className="text-lg font-bold text-gray-900">{revenueSummary?.formatted_total_revenue || '₹0'}</div>
                    <div className="text-xs text-gray-400 mt-1">{team_summary?.formatted_total_revenue || '₹0'} team total</div>
                </div>
            </div>

            {/* Team Summary Footer */}
            {team_summary && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-600 mb-3">Team Summary</h5>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <div className="text-xs text-gray-500">Total Staff</div>
                            <div className="text-lg font-semibold text-gray-800">{team_summary.total_staff || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Tasks Assigned</div>
                            <div className="text-lg font-semibold text-gray-800">{team_summary.total_tasks_assigned || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Tasks Completed</div>
                            <div className="text-lg font-semibold text-green-600">{team_summary.total_tasks_completed || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Avg Completion</div>
                            <div className="text-lg font-semibold text-blue-600">{team_summary.average_completion_rate || 0}%</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Avg On-Time</div>
                            <div className="text-lg font-semibold text-purple-600">{team_summary.average_on_time_rate || 0}%</div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default PerformanceTab;