import React, { useState, useEffect } from 'react';
import { FiUsers, FiCalendar, FiArrowUpRight, FiTrendingUp, FiAward } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const StaffWiseSales = ({ onViewDetails, refreshTrigger }) => {
    const [loading, setLoading] = useState(false);
    const [salesData, setSalesData] = useState([]);
    const [totalSales, setTotalSales] = useState(0);
    const [topStaff, setTopStaff] = useState(null);
    const [dateRange, setDateRange] = useState({
        from_date: getLastMonthDate(),
        to_date: getTodayDate()
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

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

    const fetchSalesData = async () => {
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
                
                // Handle the actual API response structure
                if (result.data.staff_wise) {
                    const staffData = result.data.staff_wise;
                    
                    if (staffData.top_staff) {
                        formattedData.push({
                            id: 0,
                            name: staffData.top_staff.name || staffData.top_staff.username,
                            value: parseFloat(staffData.top_staff.total_sales),
                            staff_id: staffData.top_staff.username
                        });
                        total = parseFloat(staffData.total_sales);
                    }
                    
                    if (staffData.staffs && Array.isArray(staffData.staffs)) {
                        formattedData = staffData.staffs.map((item, index) => ({
                            id: index,
                            name: item.name || item.username,
                            value: parseFloat(item.total_sales || item.amount || 0),
                            staff_id: item.username
                        }));
                        total = parseFloat(staffData.total_sales);
                    }
                }
                
                if (Array.isArray(result.data)) {
                    formattedData = result.data.map((item, index) => ({
                        id: index,
                        name: item.name || item.username || `Staff ${index + 1}`,
                        value: parseFloat(item.total_sales || item.amount || 0),
                        staff_id: item.username
                    }));
                    total = formattedData.reduce((sum, item) => sum + item.value, 0);
                }
                
                setSalesData(formattedData);
                setTotalSales(total);
                
                if (formattedData.length > 0) {
                    const top = formattedData.reduce((max, item) => 
                        item.value > max.value ? item : max, formattedData[0]
                    );
                    setTopStaff(top);
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
    };

    useEffect(() => {
        fetchSalesData();
    }, [dateRange, refreshTrigger]);

    const handleDateChange = (type, value) => {
        setDateRange(prev => ({
            ...prev,
            [type]: value
        }));
    };

    const COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

    // Custom Tooltip for Recharts
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-900 p-3 rounded-lg shadow-xl z-50">
                    <div className="text-white text-xs space-y-1">
                        <p className="font-semibold mb-1">{data.name}</p>
                        <p>Amount: {formatCurrency(data.value)}</p>
                        <p>Share: {((data.value / totalSales) * 100).toFixed(1)}%</p>
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
                        onClick={() => onViewDetails && onViewDetails()}
                        className="p-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100"
                        whileHover={{ scale: 1.05 }}
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
                                <p className="text-xs text-gray-500">Top Staff</p>
                                <p className="text-sm font-semibold text-amber-800 truncate">{topStaff.name}</p>
                                <p className="text-sm font-bold text-amber-600">{formatCurrency(topStaff.value)}</p>
                            </div>
                        )}
                    </div>

                    {/* Pie Chart and Bar Chart */}
                    <div className="space-y-4">
                        {/* Pie Chart */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Revenue Distribution by Staff</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={salesData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        outerRadius={70}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {salesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Sales by Staff Member</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={salesData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value).replace('₹', '')} />
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" fill="#10b981" name="Sales Amount">
                                        {salesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Staff List with Progress Bars */}
                    <div className="mt-4">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Staff Details</h4>
                        <div className="space-y-2">
                            {salesData.map((staff, index) => {
                                const percentage = (staff.value / totalSales) * 100;
                                return (
                                    <div key={staff.id} className="bg-gray-50 rounded-lg p-2">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <div className="flex items-center gap-1.5 flex-1">
                                                <div 
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="text-gray-700 font-medium">{staff.name}</span>
                                            </div>
                                            <span className="font-semibold text-teal-600">
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
                                        <div className="text-right text-xs text-gray-500 mt-1">
                                            {percentage.toFixed(1)}% of total
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