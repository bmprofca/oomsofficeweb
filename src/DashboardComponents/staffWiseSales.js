import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiUsers, FiCalendar, FiArrowUpRight, FiTrendingUp, FiAward } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const StaffWiseSales = ({ refreshTrigger }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [salesData, setSalesData] = useState([]);
    const [totalSales, setTotalSales] = useState(0);
    const [topStaff, setTopStaff] = useState(null);
    const [dateRange, setDateRange] = useState({
        from_date: getLastMonthDate(),
        to_date: getTodayDate()
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [hoveredStaff, setHoveredStaff] = useState(null);

    function getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    function getLastMonthDate() {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return lastMonth.toISOString().split('T')[0];
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const fetchSalesData = useCallback(async () => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const url = `${API_BASE_URL}/report/sales-top-summary?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}&type=staff`;
            
            const response = await fetch(url, {
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
                let formattedData = [];
                let total = 0;
                
                if (result.data.staff_wise) {
                    const staffData = result.data.staff_wise;
                    
                    if (staffData.staffs && Array.isArray(staffData.staffs)) {
                        formattedData = staffData.staffs.map((item, index) => ({
                            id: item.username || index,
                            name: item.name || item.username,
                            value: parseFloat(item.total_sales || item.amount || 0),
                            staff_id: item.username,
                            percentage: parseFloat(item.percentage) || 0,
                            tasks: item.total_tasks || 0,
                            invoices: item.total_invoices || 0
                        }));
                        total = parseFloat(staffData.total_sales);
                    } else if (staffData.top_staff) {
                        formattedData = [{
                            id: staffData.top_staff.username || 0,
                            name: staffData.top_staff.name || staffData.top_staff.username,
                            value: parseFloat(staffData.top_staff.total_sales),
                            staff_id: staffData.top_staff.username,
                            percentage: 100,
                            tasks: staffData.top_staff.total_tasks || 0,
                            invoices: staffData.top_staff.total_invoices || 0
                        }];
                        total = parseFloat(staffData.total_sales);
                    }
                }
                
                if (Array.isArray(result.data)) {
                    formattedData = result.data.map((item, index) => ({
                        id: item.username || index,
                        name: item.name || item.username || `Staff ${index + 1}`,
                        value: parseFloat(item.total_sales || item.amount || 0),
                        staff_id: item.username,
                        percentage: 0,
                        tasks: item.total_tasks || 0,
                        invoices: item.total_invoices || 0
                    }));
                    total = formattedData.reduce((sum, item) => sum + item.value, 0);
                    
                    formattedData = formattedData.map(item => ({
                        ...item,
                        percentage: (item.value / total) * 100
                    }));
                }
                
                setSalesData(formattedData);
                setTotalSales(total);
                
                if (formattedData.length > 0) {
                    const top = formattedData.reduce((max, item) => 
                        item.value > max.value ? item : max, formattedData[0]
                    );
                    setTopStaff(top);
                } else {
                    setTopStaff(null);
                }
            } else {
                throw new Error(result.message || 'Failed to fetch staff sales data');
            }
        } catch (err) {
            console.error('Staff Sales API Error:', err);
            setSalesData([]);
            setTotalSales(0);
            setTopStaff(null);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchSalesData();
    }, [fetchSalesData, refreshTrigger]);

    const handleDateChange = (type, value) => {
        setDateRange(prev => ({
            ...prev,
            [type]: value
        }));
    };

    const handleViewDetails = () => {
        navigate(`/staff-sales-details?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}`);
    };

    const COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-900 p-3 rounded-lg shadow-xl z-50">
                    <div className="text-white text-xs space-y-1">
                        <p className="font-semibold mb-1">{data.name}</p>
                        <p>Amount: {formatCurrency(data.value)}</p>
                        <p>Share: {((data.value / totalSales) * 100).toFixed(1)}%</p>
                        {data.tasks && <p>Tasks: {data.tasks}</p>}
                        {data.invoices && <p>Invoices: {data.invoices}</p>}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-lg">
                        <FiUsers className="w-4 h-4 text-teal-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800">Staff Wise Sales</h3>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Date Range Picker */}
                    <div className="relative">
                        <motion.button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs hover:shadow-md"
                            whileHover={{ scale: 1.02 }}
                        >
                            <FiCalendar className="w-3 h-3" />
                            <span>Date</span>
                        </motion.button>
                        
                        {showDatePicker && (
                            <div className="absolute right-0 mt-2 p-3 bg-white rounded-lg shadow-xl border border-gray-200 z-10 min-w-[240px]">
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        value={dateRange.from_date}
                                        onChange={(e) => handleDateChange('from_date', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                    <input
                                        type="date"
                                        value={dateRange.to_date}
                                        onChange={(e) => handleDateChange('to_date', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                    <button
                                        onClick={() => setShowDatePicker(false)}
                                        className="w-full px-3 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* View Details Button */}
                    <motion.button
                        onClick={handleViewDetails}
                        className="p-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100"
                        whileHover={{ scale: 1.05 }}
                        disabled={salesData.length === 0}
                    >
                        <FiArrowUpRight className="w-3.5 h-3.5" />
                    </motion.button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                </div>
            ) : salesData.length > 0 ? (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500">Total Sales</p>
                            <p className="text-lg font-bold text-teal-600">{formatCurrency(totalSales)}</p>
                        </div>
                        {topStaff && (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Top Performer</p>
                                <p className="text-sm font-semibold text-amber-800 truncate" title={topStaff.name}>
                                    {topStaff.name}
                                </p>
                                <p className="text-sm font-bold text-amber-600">{formatCurrency(topStaff.value)}</p>
                            </div>
                        )}
                    </div>

                    {/* Compact View */}
                    <div className="flex gap-4">
                        {/* Mini Pie Chart */}
                        <div className="flex-shrink-0">
                            <div className="relative" style={{ width: '160px', height: '160px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={salesData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={70}
                                            paddingAngle={2}
                                            dataKey="value"
                                            onMouseEnter={(data, index) => setHoveredStaff(salesData[index])}
                                            onMouseLeave={() => setHoveredStaff(null)}
                                        >
                                            {salesData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500">Total</p>
                                        <p className="text-sm font-bold text-teal-600">{formatCurrency(totalSales).replace('₹', '')}</p>
                                    </div>
                                </div>
                                
                                {/* Hover Tooltip */}
                                {hoveredStaff && (
                                    <div className="absolute top-0 left-full ml-2 p-2 bg-gray-900 text-white rounded-lg shadow-xl z-10 whitespace-nowrap">
                                        <div className="text-xs">
                                            <p className="font-semibold">{hoveredStaff.name}</p>
                                            <p>{formatCurrency(hoveredStaff.value)}</p>
                                            <p>{((hoveredStaff.value / totalSales) * 100).toFixed(1)}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Staff List */}
                        <div className="flex-1 space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {salesData.map((staff, index) => {
                                const percentage = (staff.value / totalSales) * 100;
                                return (
                                    <div
                                        key={staff.id}
                                        className="group relative"
                                        onMouseEnter={() => setHoveredStaff(staff)}
                                        onMouseLeave={() => setHoveredStaff(null)}
                                    >
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <div 
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="text-gray-700 truncate" title={staff.name}>
                                                    {staff.name}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-teal-600 flex-shrink-0 ml-2">
                                                {formatCurrency(staff.value)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div 
                                                className="h-full rounded-full transition-all"
                                                style={{ 
                                                    width: `${percentage}%`,
                                                    backgroundColor: COLORS[index % COLORS.length]
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-8">
                    <FiUsers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No data available</p>
                </div>
            )}
        </div>
    );
};

export default StaffWiseSales;