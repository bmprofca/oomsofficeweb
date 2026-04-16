// src/pages/TopClientsViewAll.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiAward, FiRefreshCw, FiCalendar, FiArrowLeft, FiDownload, 
  FiPieChart, FiBarChart2, FiTrendingUp, FiUsers, FiDollarSign,
  FiEye, FiEyeOff, FiGrid
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar, Header } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const TopClientsViewAll = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [summary, setSummary] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [sortBy, setSortBy] = useState('amount');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('table');
    const [blurEnabled, setBlurEnabled] = useState(false);
    
    // Date state - Default to last 30 days
    const [dateRange, setDateRange] = useState(() => {
        const to_date = new Date().toISOString().split('T')[0];
        const from_date = new Date();
        from_date.setDate(from_date.getDate() - 30);
        const from_date_str = from_date.toISOString().split('T')[0];
        return { from_date: from_date_str, to_date: to_date };
    });
    
    const [tempDateRange, setTempDateRange] = useState({ from_date: '', to_date: '' });

    // Colors for charts
    const COLORS = ['#FF6B35', '#F7931E', '#FBB03B', '#FFD700', '#FFB347', '#FF8C42', '#FFA559', '#FFC46B', '#FFD89C', '#FFE4B5'];
    const GRADIENT_COLORS = ['#10B981', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E', '#EF4444'];

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const fetchAllClients = async () => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const response = await fetch(
                `${API_BASE_URL}/report/top-clients-by-sales?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}&limit=100&page_no=1`,
                {
                    method: 'GET',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const result = await response.json();

            if (result.success && result.data) {
                setClients(result.data.clients || []);
                setSummary(result.data.summary);
            }
        } catch (err) {
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const setQuickDateRange = (days) => {
        const to_date = new Date().toISOString().split('T')[0];
        const from_date = new Date();
        from_date.setDate(from_date.getDate() - days);
        const from_date_str = from_date.toISOString().split('T')[0];
        setDateRange({ from_date: from_date_str, to_date: to_date });
        setShowDatePicker(false);
    };

    const setThisMonth = () => {
        const now = new Date();
        const to_date = now.toISOString().split('T')[0];
        const from_date = new Date(now.getFullYear(), now.getMonth(), 1);
        const from_date_str = from_date.toISOString().split('T')[0];
        setDateRange({ from_date: from_date_str, to_date: to_date });
        setShowDatePicker(false);
    };

    const setLastMonth = () => {
        const now = new Date();
        const to_date = new Date(now.getFullYear(), now.getMonth(), 0);
        const from_date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        setDateRange({ 
            from_date: from_date.toISOString().split('T')[0], 
            to_date: to_date.toISOString().split('T')[0] 
        });
        setShowDatePicker(false);
    };

    const setThisYear = () => {
        const now = new Date();
        const to_date = now.toISOString().split('T')[0];
        const from_date = new Date(now.getFullYear(), 0, 1);
        setDateRange({ 
            from_date: from_date.toISOString().split('T')[0], 
            to_date: to_date 
        });
        setShowDatePicker(false);
    };

    const applyCustomDate = () => {
        if (tempDateRange.from_date && tempDateRange.to_date) {
            setDateRange({
                from_date: tempDateRange.from_date,
                to_date: tempDateRange.to_date
            });
            setShowDatePicker(false);
            setTempDateRange({ from_date: '', to_date: '' });
        }
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const exportToCSV = () => {
        const headers = ['Rank', 'Client Name', 'Mobile', 'Email', 'Total Amount', 'Percentage'];
        const csvData = sortedAndFilteredClients.map((client, index) => [
            index + 1,
            client.client_info.name,
            client.client_info.contact.mobile,
            client.client_info.contact.email,
            client.sales_summary.total_amount,
            summary && summary.grand_total_sales > 0 
                ? ((client.sales_summary.total_amount / summary.grand_total_sales) * 100).toFixed(2) + '%'
                : '0%'
        ]);

        const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `top-clients-${dateRange.from_date}-to-${dateRange.to_date}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Prepare chart data
    const getChartData = () => {
        return sortedAndFilteredClients.slice(0, 20).map((client, index) => ({
            name: client.client_info.name.length > 20 
                ? client.client_info.name.substring(0, 20) + '...' 
                : client.client_info.name,
            amount: client.sales_summary.total_amount,
            rank: index + 1
        }));
    };

    const getPieChartData = () => {
        return sortedAndFilteredClients.slice(0, 10).map((client, index) => ({
            name: client.client_info.name.split(' ')[0],
            value: client.sales_summary.total_amount,
            percentage: ((client.sales_summary.total_amount / summary?.grand_total_sales) * 100).toFixed(1)
        }));
    };

    // Filter and sort clients
    const filteredClients = clients.filter(client => 
        client.client_info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.client_info.contact.mobile.includes(searchTerm) ||
        client.client_info.contact.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedAndFilteredClients = [...filteredClients].sort((a, b) => {
        if (sortBy === 'amount') {
            return sortOrder === 'desc' 
                ? b.sales_summary.total_amount - a.sales_summary.total_amount
                : a.sales_summary.total_amount - b.sales_summary.total_amount;
        } else if (sortBy === 'name') {
            return sortOrder === 'desc'
                ? b.client_info.name.localeCompare(a.client_info.name)
                : a.client_info.name.localeCompare(b.client_info.name);
        }
        return 0;
    });

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedAndFilteredClients.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedAndFilteredClients.length / itemsPerPage);

    useEffect(() => {
        fetchAllClients();
    }, [dateRange]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
                    <p className="font-semibold text-gray-800">{label}</p>
                    <p className="text-green-600 font-bold">
                        {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Get visible value (blurred or actual)
    const getVisibleValue = (value, isCurrency = true) => {
        if (blurEnabled) {
            return '******';
        }
        return isCurrency ? formatCurrency(value) : value;
    };

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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <motion.button
                                onClick={() => navigate('/')}
                                className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FiArrowLeft className="w-5 h-5 text-gray-600" />
                            </motion.button>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                                    <FiAward className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">
                                        Top Clients Performance
                                    </h1>
                                    {summary && (
                                        <p className="text-gray-500 text-sm">
                                            Total Sales: {getVisibleValue(summary.grand_total_sales)} | 
                                            Total Clients: {summary.total_clients}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Blur Toggle */}
                            <motion.button
                                onClick={() => setBlurEnabled(!blurEnabled)}
                                className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {blurEnabled ? (
                                    <FiEye className="w-4 h-4 text-gray-600" />
                                ) : (
                                    <FiEyeOff className="w-4 h-4 text-gray-600" />
                                )}
                            </motion.button>

                            {/* View Mode Toggle */}
                            <div className="flex bg-white border border-gray-200 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                        viewMode === 'table' 
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' 
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    Table View
                                </button>
                                <button
                                    onClick={() => setViewMode('chart')}
                                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                        viewMode === 'chart' 
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' 
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    Chart View
                                </button>
                            </div>

                            {/* Date Picker */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-sm"
                                >
                                    <FiCalendar className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-700">
                                        {formatDate(dateRange.from_date)} - {formatDate(dateRange.to_date)}
                                    </span>
                                </button>
                                
                                {showDatePicker && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs font-medium text-gray-500 mb-2">Quick Select</div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => setQuickDateRange(7)} className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">Last 7 days</button>
                                                    <button onClick={() => setQuickDateRange(30)} className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">Last 30 days</button>
                                                    <button onClick={setThisMonth} className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">This Month</button>
                                                    <button onClick={setLastMonth} className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">Last Month</button>
                                                    <button onClick={() => setQuickDateRange(90)} className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">Last 90 days</button>
                                                    <button onClick={setThisYear} className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">This Year</button>
                                                </div>
                                            </div>
                                            
                                            <div className="border-t border-gray-100 pt-4">
                                                <div className="text-xs font-medium text-gray-500 mb-2">Custom Range</div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs text-gray-600">From Date</label>
                                                        <input
                                                            type="date"
                                                            value={tempDateRange.from_date}
                                                            onChange={(e) => setTempDateRange({ ...tempDateRange, from_date: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">To Date</label>
                                                        <input
                                                            type="date"
                                                            value={tempDateRange.to_date}
                                                            onChange={(e) => setTempDateRange({ ...tempDateRange, to_date: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={applyCustomDate}
                                                        className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-md"
                                                    >
                                                        Apply Range
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <motion.button
                                onClick={fetchAllClients}
                                className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FiRefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                            </motion.button>
                            
                            <motion.button
                                onClick={exportToCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-medium"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FiDownload className="w-4 h-4" />
                                Export CSV
                            </motion.button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <motion.div 
                                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm">Total Sales</p>
                                        <p className="text-2xl font-bold text-gray-800">{getVisibleValue(summary.grand_total_sales)}</p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-xl">
                                        <FiDollarSign className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </motion.div>
                            <motion.div 
                                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm">Total Clients</p>
                                        <p className="text-2xl font-bold text-gray-800">{summary.total_clients}</p>
                                    </div>
                                    <div className="p-3 bg-blue-100 rounded-xl">
                                        <FiUsers className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </motion.div>
                            <motion.div 
                                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm">Average per Client</p>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {getVisibleValue(summary.grand_total_sales / summary.total_clients)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-100 rounded-xl">
                                        <FiTrendingUp className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                            </motion.div>
                            <motion.div 
                                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm">Top Client Share</p>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {clients[0] && ((clients[0].sales_summary.total_amount / summary.grand_total_sales) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="p-3 bg-amber-100 rounded-xl">
                                        <FiAward className="w-6 h-6 text-amber-600" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Search and Filters */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
                        <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex-1 min-w-[250px]">
                                <input
                                    type="text"
                                    placeholder="Search by name, mobile or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSort('name')}
                                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                        sortBy === 'name' 
                                            ? 'bg-amber-100 text-amber-700 font-medium' 
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Sort by Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </button>
                                <button
                                    onClick={() => handleSort('amount')}
                                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                        sortBy === 'amount' 
                                            ? 'bg-amber-100 text-amber-700 font-medium' 
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Sort by Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'chart' ? (
                                <div className="space-y-6">
                                    {/* Bar Chart */}
                                    <motion.div 
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <FiBarChart2 className="w-5 h-5 text-amber-600" />
                                            Top 20 Clients - Sales Distribution
                                        </h3>
                                        <ResponsiveContainer width="100%" height={500}>
                                            <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                                                <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend />
                                                <Bar dataKey="amount" fill="#FF6B35" name="Sales Amount">
                                                    {getChartData().map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </motion.div>

                                    {/* Pie Chart */}
                                    <motion.div 
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <FiPieChart className="w-5 h-5 text-amber-600" />
                                            Top 10 Clients - Market Share
                                        </h3>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <PieChart>
                                                <Pie
                                                    data={getPieChartData()}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={true}
                                                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                                                    outerRadius={150}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {getPieChartData().map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </motion.div>

                                    {/* Area Chart for Trend */}
                                    <motion.div 
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <FiTrendingUp className="w-5 h-5 text-amber-600" />
                                            Cumulative Sales Trend
                                        </h3>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <AreaChart data={getChartData().map((item, idx) => ({
                                                ...item,
                                                cumulative: getChartData().slice(0, idx + 1).reduce((sum, i) => sum + i.amount, 0)
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                                                <YAxis tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`} />
                                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                                <Area type="monotone" dataKey="cumulative" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Cumulative Sales" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </motion.div>
                                </div>
                            ) : (
                                /* Table View */
                                <motion.div 
                                    className="overflow-hidden rounded-xl shadow-sm border border-gray-200 bg-white"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                                <tr>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">#</th>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Name</th>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Contact</th>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Firms</th>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Amount</th>
                                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Share %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {currentItems.map((client, index) => (
                                                    <tr key={client.client_info.username || index} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-4">
                                                            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                                                                (indexOfFirstItem + index) < 3 
                                                                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600' 
                                                                    : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                <span className="font-bold">{indexOfFirstItem + index + 1}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="font-semibold text-gray-800">{client.client_info.name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {client.client_info.care_of || 'C/O'}: {client.client_info.guardian_name}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="text-gray-700 font-medium">{client.client_info.contact.mobile}</div>
                                                            <div className="text-sm text-gray-500">{client.client_info.contact.email}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            {client.firms && client.firms.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {client.firms.slice(0, 2).map((firm, idx) => (
                                                                        <span key={idx} className="px-2 py-1 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 text-xs rounded-full">
                                                                            {firm.firm_name}
                                                                        </span>
                                                                    ))}
                                                                    {client.firms.length > 2 && (
                                                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                                            +{client.firms.length - 2} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">No firms</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent ${blurEnabled ? 'blur-sm' : ''}`}>
                                                                {getVisibleValue(client.sales_summary.total_amount)}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                    <div 
                                                                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                                                                        style={{ width: `${(client.sales_summary.total_amount / summary.grand_total_sales) * 100}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-sm text-gray-600 min-w-[45px]">
                                                                    {((client.sales_summary.total_amount / summary.grand_total_sales) * 100).toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {sortedAndFilteredClients.length === 0 && (
                                        <div className="text-center py-12 text-gray-500">
                                            No client data found
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {sortedAndFilteredClients.length > 0 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 gap-4">
                                            <div className="text-sm text-gray-600">
                                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedAndFilteredClients.length)} of {sortedAndFilteredClients.length} clients
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                                >
                                                    Previous
                                                </button>
                                                <span className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm">
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopClientsViewAll;