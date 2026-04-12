import React, { useState, useEffect, useCallback } from 'react';
import {
  FiArrowLeft,
  FiDownload,
  FiCalendar,
  FiUsers,
  FiBarChart2,
  FiTrendingUp,
  FiAward,
  FiFileText,
  FiGrid,
  FiList,
  FiUser,
  FiBriefcase,
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#ef4444', '#84cc16', '#d946ef', '#f59e0b',
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const SummaryCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    pink: 'bg-pink-50 text-pink-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <p className="text-xs text-gray-500">{title}</p>
      </div>
      <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
    </div>
  );
};

const StaffSalesDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState({ from_date: '', to_date: '' });
  const [viewMode, setViewMode] = useState('chart');
  const [exporting, setExporting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });

  const queryParams = new URLSearchParams(location.search);
  const fromDate = queryParams.get('from_date');
  const toDate = queryParams.get('to_date');

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

  const fetchData = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError('Missing date parameters');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const headers = getHeaders();
      const url = `${API_BASE_URL}/report/sales-detailed?from_date=${fromDate}&to_date=${toDate}&type=staff`;

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

      if (result.success && result.data?.staff_wise) {
        setData(result.data.staff_wise);
        setPeriod(result.data.period);
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching staff sales details:', err);
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!fromDate || !toDate) {
      navigate(-1);
      return;
    }
    fetchData();
  }, [fromDate, toDate, navigate, fetchData]);

  const handleExportCSV = () => {
    if (!data) return;
    setExporting(true);

    try {
      const csvRows = [];
      
      csvRows.push([`Staff Sales Report - ${formatDate(period.from_date)} to ${formatDate(period.to_date)}`]);
      csvRows.push([]);
      csvRows.push(['SUMMARY']);
      csvRows.push(['Total Staff Members', data.summary.total_staff_members.toString()]);
      csvRows.push(['Total Sales', formatCurrency(data.summary.total_sales)]);
      csvRows.push(['Total Fees', formatCurrency(data.summary.total_fees)]);
      csvRows.push(['Total Tax', formatCurrency(data.summary.total_tax)]);
      csvRows.push(['Total Tasks Completed', data.summary.total_tasks_completed.toString()]);
      csvRows.push(['Total Invoices Generated', data.summary.total_invoices_generated.toString()]);
      csvRows.push(['Average Sales Per Staff', formatCurrency(data.summary.avg_sales_per_staff)]);
      csvRows.push(['Average Tasks Per Staff', data.summary.avg_tasks_per_staff.toString()]);
      csvRows.push([]);
      
      csvRows.push(['STAFF DETAILS']);
      csvRows.push(['Name', 'Username', 'Email', 'Mobile', 'Total Sales', 'Total Fees', 'Total Tax', 'Total Tasks', 'Total Invoices', 'Avg per Task', 'Percentage']);
      
      data.all_staff.forEach(staff => {
        csvRows.push([
          `"${staff.name}"`,
          staff.username,
          staff.email || 'N/A',
          staff.mobile || 'N/A',
          formatCurrency(staff.total_sales),
          formatCurrency(staff.total_fees),
          formatCurrency(staff.total_tax),
          staff.total_tasks.toString(),
          staff.total_invoices.toString(),
          formatCurrency(staff.avg_sales_per_task),
          `${staff.percentage}%`,
        ]);
      });

      if (data.top_performer_service_breakdown && data.top_performer_service_breakdown.length > 0) {
        csvRows.push([]);
        csvRows.push(['TOP PERFORMER SERVICE BREAKDOWN']);
        csvRows.push(['Service Name', 'Quantity', 'Total Sales']);
        
        data.top_performer_service_breakdown.forEach(service => {
          csvRows.push([
            `"${service.service_name}"`,
            service.quantity.toString(),
            formatCurrency(service.total_sales),
          ]);
        });
      }

      csvRows.push([]);
      csvRows.push(['RECENT TASKS']);
      csvRows.push(['Task ID', 'Staff Name', 'Service', 'Invoice ID', 'Sale Amount', 'Completion Date']);
      
      data.recent_tasks.forEach(task => {
        csvRows.push([
          task.task_id,
          task.staff_name,
          `"${task.service_name}"`,
          task.invoice_id,
          formatCurrency(task.sale_amount),
          formatDateTime(task.complete_date),
        ]);
      });

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `staff_sales_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
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
        <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading staff details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
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
        <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUsers className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-700 mb-2">Failed to load data</p>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.all_staff || data.all_staff.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
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
        <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center">
              <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No data available for the selected period</p>
              <button
                onClick={handleBack}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pieChartData = (data.top_performers || []).map(staff => ({
    name: staff.name,
    value: staff.total_sales || 0,
    percentage: parseFloat(staff.percentage) || 0,
  }));

  const barChartData = (data.all_staff || []).map(staff => ({
    name: staff.name.length > 15 ? staff.name.slice(0, 12) + '...' : staff.name,
    fullName: staff.name,
    sales: staff.total_sales || 0,
    fees: staff.total_fees || 0,
    tax: staff.total_tax || 0,
    tasks: staff.total_tasks || 0,
    invoices: staff.total_invoices || 0,
  }));

  const serviceBreakdownData = (data.top_performer_service_breakdown || []).map(service => ({
    name: service.service_name.length > 15 ? service.service_name.slice(0, 12) + '...' : service.service_name,
    fullName: service.service_name,
    sales: service.total_sales || 0,
    quantity: service.quantity || 0,
  }));

  const dailyTrendData = (data.daily_sales_trend || []).map(day => ({
    date: formatDate(day.date),
    sales: day.sales || 0,
    tasks: day.tasks || 0,
    staff: day.staff_name,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
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
      <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-72'}`}>
        <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-600" />
                </motion.button>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Staff Sales Details</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formatDate(period.from_date)} - {formatDate(period.to_date)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                      viewMode === 'chart'
                        ? 'bg-white shadow text-teal-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiBarChart2 className="w-4 h-4" />
                    Charts
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                      viewMode === 'table'
                        ? 'bg-white shadow text-teal-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiList className="w-4 h-4" />
                    Table
                  </button>
                </div>
                <motion.button
                  onClick={handleExportCSV}
                  disabled={exporting}
                  className="px-3 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: exporting ? 1 : 1.02 }}
                  whileTap={{ scale: exporting ? 1 : 0.98 }}
                >
                  <FiDownload className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            <SummaryCard title="Total Staff" value={data.summary.total_staff_members.toString()} icon={<FiUsers className="w-4 h-4" />} color="teal" />
            <SummaryCard title="Total Sales" value={formatCurrency(data.summary.total_sales)} icon={<FiTrendingUp className="w-4 h-4" />} color="green" />
            <SummaryCard title="Total Fees" value={formatCurrency(data.summary.total_fees)} icon={<FiFileText className="w-4 h-4" />} color="blue" />
            <SummaryCard title="Total Tax" value={formatCurrency(data.summary.total_tax)} icon={<FiFileText className="w-4 h-4" />} color="orange" />
            <SummaryCard title="Total Tasks" value={data.summary.total_tasks_completed.toString()} icon={<FiBriefcase className="w-4 h-4" />} color="purple" />
            <SummaryCard title="Total Invoices" value={data.summary.total_invoices_generated.toString()} icon={<FiFileText className="w-4 h-4" />} color="pink" />
            <SummaryCard title="Avg Sales/Staff" value={formatCurrency(data.summary.avg_sales_per_staff)} icon={<FiAward className="w-4 h-4" />} color="amber" />
            <SummaryCard title="Avg Tasks/Staff" value={data.summary.avg_tasks_per_staff.toString()} icon={<FiGrid className="w-4 h-4" />} color="indigo" />
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'chart' ? (
              <motion.div key="chart-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FiUsers className="w-4 h-4 text-teal-500" />
                        Sales Distribution by Staff
                      </h3>
                    </div>
                    <div className="h-80">
                      {pieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''} labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: 'white' }} />
                            <Legend wrapperStyle={{ paddingLeft: '20px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center"><p className="text-gray-400">No data available</p></div>
                      )}
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FiBarChart2 className="w-4 h-4 text-teal-500" />
                        Sales & Tasks Comparison
                      </h3>
                    </div>
                    <div className="h-80">
                      {barChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="left" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip formatter={(value, name) => {
                              if (name === 'sales') return [formatCurrency(value), 'Total Sales'];
                              if (name === 'tasks') return [value, 'Tasks Completed'];
                              return [value, name];
                            }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales Amount" />
                            <Bar yAxisId="right" dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tasks Completed" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center"><p className="text-gray-400">No data available</p></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Service Breakdown for Top Performer */}
                {serviceBreakdownData.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                      <FiBriefcase className="w-4 h-4 text-teal-500" />
                      Top Performer - Service Breakdown
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={serviceBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tickFormatter={(value) => formatCurrency(value).replace('₹', '')} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value, name) => {
                            if (name === 'sales') return [formatCurrency(value), 'Total Sales'];
                            if (name === 'quantity') return [value, 'Quantity Sold'];
                            return [value, name];
                          }} />
                          <Legend />
                          <Bar dataKey="sales" fill="#10b981" radius={[0, 4, 4, 0]} name="Sales Amount" />
                          <Bar dataKey="quantity" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Quantity" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Daily Sales Trend */}
                {dailyTrendData.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                      <FiTrendingUp className="w-4 h-4 text-teal-500" />
                      Daily Sales & Tasks Trend
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="left" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip formatter={(value, name) => {
                            if (name === 'sales') return [formatCurrency(value), 'Sales'];
                            if (name === 'tasks') return [value, 'Tasks'];
                            return [value, name];
                          }} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Sales" dot={{ fill: '#10b981', strokeWidth: 2 }} />
                          <Line yAxisId="right" type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={2} name="Tasks" dot={{ fill: '#3b82f6', strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="table-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* Staff Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">All Staff Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fees</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tasks</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Invoices</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg/Task</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Share</th>
                        </tr>
                      </thead>
                  <tbody className="divide-y divide-gray-100">
  {data.all_staff.map((staff, idx) => (
    <tr key={staff.username} className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-800">{staff.name}</div>
        <div className="text-xs text-gray-500">@{staff.username}</div>
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3">
        <div className="text-xs text-gray-600">{staff.email || 'N/A'}</div>
        <div className="text-xs text-gray-500">{staff.mobile || 'N/A'}</div>
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3 text-right font-semibold text-teal-600">
        {formatCurrency(staff.total_sales)}
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3 text-right text-gray-600">
        {formatCurrency(staff.total_fees)}
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3 text-right text-gray-600">
        {formatCurrency(staff.total_tax)}
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3 text-center">
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
          {staff.total_tasks}
        </span>
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3 text-center">
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
          {staff.total_invoices}
        </span>
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3 text-right text-gray-600">
        {formatCurrency(staff.avg_sales_per_task)}
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3 text-gray-500 text-xs">
        {formatDate(staff.last_completion_date)}
      </td>  {/* Added closing tag */}
      <td className="px-4 py-3 text-center">
        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
          {parseFloat(staff.percentage).toFixed(1)}%
        </span>
      </td>  {/* Added closing tag */}
    </tr>
  ))}
</tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Tasks Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Recent Tasks Completed</h3>
                    <span className="text-xs text-gray-400">Last {data.recent_tasks.length} tasks</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sale Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recent_tasks.map((task) => (
                          <tr key={task.task_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs text-teal-600">{task.task_id.slice(0, 8)}...</td>
                            <td className="px-4 py-3 text-gray-700">{task.staff_name}</td>
                            <td className="px-4 py-3 text-gray-600">{task.service_name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{task.invoice_id.slice(0, 8)}...</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(task.sale_amount)}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(task.complete_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default StaffSalesDetails;