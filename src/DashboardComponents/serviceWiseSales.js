import React, { useState, useEffect } from 'react';
import { FiPieChart, FiCalendar, FiArrowUpRight, FiTrendingUp, FiAward } from 'react-icons/fi';
import { motion } from 'framer-motion';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const ServiceWiseSales = ({ onViewDetails, refreshTrigger }) => {
    const [loading, setLoading] = useState(false);
    const [salesData, setSalesData] = useState([]);
    const [totalSales, setTotalSales] = useState(0);
    const [topService, setTopService] = useState(null);
    const [dateRange, setDateRange] = useState({
        from_date: getLastMonthDate(),
        to_date: getTodayDate()
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [hoveredService, setHoveredService] = useState(null);

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
            const url = `${API_BASE_URL}/report/sales-top-summary?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}&type=service`;
            
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
                
                if (result.data.service_wise) {
                    const serviceData = result.data.service_wise;
                    
                    if (serviceData.top_service) {
                        formattedData.push({
                            id: 0,
                            name: serviceData.top_service.service_name,
                            value: parseFloat(serviceData.top_service.total_sales),
                            service_id: serviceData.top_service.service_id
                        });
                        total = parseFloat(serviceData.total_sales);
                    }
                    
                    if (serviceData.services && Array.isArray(serviceData.services)) {
                        formattedData = serviceData.services.map((item, index) => ({
                            id: index,
                            name: item.service_name || item.name,
                            value: parseFloat(item.total_sales || item.amount || 0),
                            service_id: item.service_id
                        }));
                        total = parseFloat(serviceData.total_sales);
                    }
                }
                
                if (Array.isArray(result.data)) {
                    formattedData = result.data.map((item, index) => ({
                        id: index,
                        name: item.service_name || item.name || `Service ${index + 1}`,
                        value: parseFloat(item.total_sales || item.amount || 0),
                        service_id: item.service_id
                    }));
                    total = formattedData.reduce((sum, item) => sum + item.value, 0);
                }
                
                setSalesData(formattedData);
                setTotalSales(total);
                
                if (formattedData.length > 0) {
                    const top = formattedData.reduce((max, item) => 
                        item.value > max.value ? item : max, formattedData[0]
                    );
                    setTopService(top);
                }
            } else {
                throw new Error(result.message || 'Failed to fetch service sales data');
            }
        } catch (err) {
            console.error('Service Sales API Error:', err);
            setSalesData([]);
            setTotalSales(0);
            setTopService(null);
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

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#14b8a6'];

    // Calculate pie chart segments
    const calculatePieSegments = (data, total) => {
        if (data.length === 0 || total === 0) return [];
        
        let currentAngle = -90;
        const segments = [];
        
        data.forEach((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = 80 + 70 * Math.cos(startRad);
            const y1 = 80 + 70 * Math.sin(startRad);
            const x2 = 80 + 70 * Math.cos(endRad);
            const y2 = 80 + 70 * Math.sin(endRad);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            const pathData = `M 80 80 L ${x1} ${y1} A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            
            segments.push({
                id: index,
                path: pathData,
                color: COLORS[index % COLORS.length],
                percentage,
                item
            });
            
            currentAngle = endAngle;
        });
        
        return segments;
    };

    const pieSegments = calculatePieSegments(salesData, totalSales);

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg">
                        <FiPieChart className="w-4 h-4 text-violet-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800">Service Wise Sales</h3>
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
                                        className="w-full px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
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
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                        whileHover={{ scale: 1.05 }}
                    >
                        <FiArrowUpRight className="w-3.5 h-3.5" />
                    </motion.button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
            ) : salesData.length > 0 ? (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500">Total Sales</p>
                            <p className="text-lg font-bold text-indigo-600">{formatCurrency(totalSales)}</p>
                        </div>
                        {topService && (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Top Service</p>
                                <p className="text-sm font-semibold text-amber-800 truncate">{topService.name}</p>
                                <p className="text-sm font-bold text-amber-600">{formatCurrency(topService.value)}</p>
                            </div>
                        )}
                    </div>

                    {/* Compact Pie Chart and List */}
                    <div className="flex gap-4">
                        {/* Mini Pie Chart */}
                        <div className="flex-shrink-0">
                            <div className="relative" style={{ width: '160px', height: '160px' }}>
                                <svg width="160" height="160" viewBox="0 0 160 160">
                                    {pieSegments.map((segment) => (
                                        <path
                                            key={segment.id}
                                            d={segment.path}
                                            fill={segment.color}
                                            stroke="white"
                                            strokeWidth="1.5"
                                            onMouseEnter={() => setHoveredService(segment.item)}
                                            onMouseLeave={() => setHoveredService(null)}
                                            className="cursor-pointer transition-opacity hover:opacity-80"
                                        />
                                    ))}
                                    <circle cx="80" cy="80" r="35" fill="white" />
                                    <text x="80" y="76" textAnchor="middle" className="text-xs font-semibold fill-gray-600">
                                        Total
                                    </text>
                                    <text x="80" y="92" textAnchor="middle" className="text-xs font-bold fill-indigo-600">
                                        {formatCurrency(totalSales).replace('₹', '')}
                                    </text>
                                </svg>
                                
                                {/* Hover Tooltip */}
                                {hoveredService && (
                                    <div className="absolute top-0 left-full ml-2 p-2 bg-gray-900 text-white rounded-lg shadow-xl z-10 whitespace-nowrap">
                                        <div className="text-xs">
                                            <p className="font-semibold">{hoveredService.name}</p>
                                            <p>{formatCurrency(hoveredService.value)}</p>
                                            <p>{((hoveredService.value / totalSales) * 100).toFixed(1)}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Service List */}
                        <div className="flex-1 space-y-2">
                            {salesData.map((service, index) => {
                                const percentage = (service.value / totalSales) * 100;
                                return (
                                    <div
                                        key={service.id}
                                        className="group relative"
                                        onMouseEnter={() => setHoveredService(service)}
                                        onMouseLeave={() => setHoveredService(null)}
                                    >
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <div className="flex items-center gap-1.5 flex-1">
                                                <div 
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="text-gray-700 truncate">{service.name}</span>
                                            </div>
                                            <span className="font-semibold text-indigo-600">
                                                {formatCurrency(service.value)}
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
                    <FiPieChart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No data available</p>
                </div>
            )}
        </div>
    );
};

export default ServiceWiseSales;