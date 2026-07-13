import React, { useState, useEffect } from 'react';
import { FiAward, FiRefreshCw, FiCalendar, FiArrowRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const TopClients = ({ refreshTrigger = 0 }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [topClients, setTopClients] = useState([]);
    const [summary, setSummary] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    
    // Date state - Default to last 30 days
    const [dateRange, setDateRange] = useState(() => {
        const to_date = new Date().toISOString().split('T')[0];
        const from_date = new Date();
        from_date.setDate(from_date.getDate() - 30);
        const from_date_str = from_date.toISOString().split('T')[0];
        return { from_date: from_date_str, to_date: to_date };
    });
    
    const [tempDateRange, setTempDateRange] = useState({ from_date: '', to_date: '' });

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

    const fetchTopClients = async () => {
        setLoading(true);
        try {
            const headers = getHeaders();
            const response = await fetch(
                `${API_BASE_URL}/report/top-clients-by-sales?from_date=${dateRange.from_date}&to_date=${dateRange.to_date}&limit=10&page_no=1`,
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
                setTopClients(result.data.clients || []);
                setSummary(result.data.summary);
            }
        } catch (err) {
            console.error('Error fetching top clients:', err);
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

    useEffect(() => {
        fetchTopClients();
    }, [dateRange, refreshTrigger]);

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                        <FiAward className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">
                            Top 10 Clients by Sales
                        </h3>
                        {summary && (
                            <p className="text-gray-500 text-sm">
                                Total Sales: {formatCurrency(summary.grand_total_sales)} | 
                                Total Clients: {summary.total_clients}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Date Picker Button */}
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
                                    {/* Quick Presets */}
                                    <div>
                                        <div className="text-xs font-medium text-gray-500 mb-2">Quick Select</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setQuickDateRange(7)}
                                                className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                            >
                                                Last 7 days
                                            </button>
                                            <button
                                                onClick={() => setQuickDateRange(30)}
                                                className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                            >
                                                Last 30 days
                                            </button>
                                            <button
                                                onClick={setThisMonth}
                                                className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                            >
                                                This Month
                                            </button>
                                            <button
                                                onClick={setLastMonth}
                                                className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                            >
                                                Last Month
                                            </button>
                                            <button
                                                onClick={() => setQuickDateRange(90)}
                                                className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                            >
                                                Last 90 days
                                            </button>
                                            <button
                                                onClick={setThisYear}
                                                className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                            >
                                                This Year
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Custom Range */}
                                    <div className="border-t border-gray-100 pt-4">
                                        <div className="text-xs font-medium text-gray-500 mb-2">Custom Range</div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-600">From Date</label>
                                                <input
                                                    type="date"
                                                    value={tempDateRange.from_date}
                                                    onChange={(e) => setTempDateRange({ ...tempDateRange, from_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">To Date</label>
                                                <input
                                                    type="date"
                                                    value={tempDateRange.to_date}
                                                    onChange={(e) => setTempDateRange({ ...tempDateRange, to_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={applyCustomDate}
                                                className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
                                            >
                                                Apply Range
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Refresh Button */}
                    <button
                        onClick={fetchTopClients}
                        className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        <FiRefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    
                    {/* Redirect Button */}
                    <button
                        onClick={() => navigate('/clients/top')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-md transition-all text-sm font-medium"
                    >
                        View All
                        <FiArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">#</th>
                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Name</th>
                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Contact</th>
                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Firms</th>
                                <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {topClients.map((client, index) => (
                                <tr key={client.client_info.username || index} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                                            index < 3 ? 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            <span className="font-bold">{client.rank || index + 1}</span>
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
                                                {client.firms.map((firm, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="px-2 py-1 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 text-xs rounded-full"
                                                    >
                                                        {firm.firm_name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">No firms</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                            {formatCurrency(client.sales_summary.total_amount)}
                                        </span>
                                        {summary && summary.grand_total_sales > 0 && (
                                            <div className="text-xs text-gray-400">
                                                {((client.sales_summary.total_amount / summary.grand_total_sales) * 100).toFixed(1)}%
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {topClients.length === 0 && !loading && (
                        <div className="text-center py-12 text-gray-500">
                            No client data found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TopClients;