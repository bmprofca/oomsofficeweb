import React, { useState, useEffect, useCallback } from 'react';
import {
  FiArrowLeft,
  FiDownload,
  FiCalendar,
  FiPieChart,
  FiBarChart2,
  FiTrendingUp,
  FiAward,
  FiFileText,
  FiGrid,
  FiList,
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
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#14b8a6',
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
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    pink: 'bg-pink-50 text-pink-600',
    amber: 'bg-amber-50 text-amber-600',
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

const ServiceSalesDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState({ from_date: '', to_date: '' });
  const [viewMode, setViewMode] = useState('chart');
  const [exporting, setExporting] = useState(false);
  
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
      const url = `${API_BASE_URL}/report/sales-detailed?from_date=${fromDate}&to_date=${toDate}&type=service`;

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

      if (result.success && result.data?.service_wise) {
        setData(result.data.service_wise);
        setPeriod(result.data.period);
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching service sales details:', err);
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
      
      csvRows.push([`Service Sales Report - ${formatDate(period.from_date)} to ${formatDate(period.to_date)}`]);
      csvRows.push([]);
      csvRows.push(['SUMMARY']);
      csvRows.push(['Total Services', data.summary.total_services.toString()]);
      csvRows.push(['Total Sales', formatCurrency(data.summary.total_sales)]);
      csvRows.push(['Total Fees', formatCurrency(data.summary.total_fees)]);
      csvRows.push(['Total Tax', formatCurrency(data.summary.total_tax)]);
      csvRows.push(['Total Invoices', data.summary.total_invoices.toString()]);
      csvRows.push(['Total Items Sold', data.summary.total_items_sold.toString()]);
      csvRows.push(['Average per Service', formatCurrency(data.summary.avg_sales_per_service)]);
      csvRows.push([]);
      csvRows.push(['SERVICE DETAILS']);
      csvRows.push(['Service Name', 'Category', 'Total Sales', 'Total Fees', 'Total Tax', 'Invoices', 'Items Sold', 'Avg per Item', 'GST Rate', 'First Sale', 'Last Sale', 'Percentage']);
      
      data.all_services.forEach(service => {
        csvRows.push([
          `"${service.service_name}"`,
          service.category_name,
          formatCurrency(service.total_sales),
          formatCurrency(service.total_fees),
          formatCurrency(service.total_tax),
          service.total_invoices.toString(),
          service.total_items_sold.toString(),
          formatCurrency(service.avg_sales_per_item),
          `${service.gst_rate}%`,
          formatDate(service.first_sale_date),
          formatDate(service.last_sale_date),
          `${service.percentage}%`,
        ]);
      });

      csvRows.push([]);
      csvRows.push(['RECENT SALES']);
      csvRows.push(['Invoice No', 'Service', 'Sale Date', 'Fees', 'Tax', 'Amount', 'Invoice Total']);
      
      data.recent_sales.forEach(sale => {
        csvRows.push([
          sale.invoice_no,
          `"${sale.service_name}"`,
          formatDateTime(sale.sale_date),
          formatCurrency(sale.fees),
          formatCurrency(sale.tax),
          formatCurrency(sale.amount),
          formatCurrency(sale.invoice_total),
        ]);
      });

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `service_sales_${fromDate}_to_${toDate}.csv`);
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
        <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading service details...</p>
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
        <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiPieChart className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-700 mb-2">Failed to load data</p>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.all_services || data.all_services.length === 0) {
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
        <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center">
              <FiPieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No data available for the selected period</p>
              <button
                onClick={handleBack}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pieChartData = (data.top_services || []).map(service => ({
    name: service.service_name,
    value: service.total_sales || 0,
    percentage: parseFloat(service.percentage) || 0,
  }));

  const barChartData = (data.all_services || []).map(service => ({
    name: service.service_name.length > 15 ? service.service_name.slice(0, 12) + '...' : service.service_name,
    fullName: service.service_name,
    sales: service.total_sales || 0,
    fees: service.total_fees || 0,
    tax: service.total_tax || 0,
    invoices: service.total_invoices || 0,
    itemsSold: service.total_items_sold || 0,
  }));

  const recentSalesData = (data.recent_sales || []).slice(0, 10).map(sale => ({
    date: formatDate(sale.sale_date),
    amount: sale.amount || 0,
    service: sale.service_name,
    invoiceNo: sale.invoice_no,
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
      <div className={`pt-16 transition-all duration-300 ease-in-out w-full ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
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
                  <h1 className="text-xl font-bold text-gray-800">Service Sales Details</h1>
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
                        ? 'bg-white shadow text-indigo-600'
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
                        ? 'bg-white shadow text-indigo-600'
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
                  className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <SummaryCard title="Total Services" value={data.summary.total_services.toString()} icon={<FiGrid className="w-4 h-4" />} color="indigo" />
            <SummaryCard title="Total Sales" value={formatCurrency(data.summary.total_sales)} icon={<FiTrendingUp className="w-4 h-4" />} color="green" />
            <SummaryCard title="Total Fees" value={formatCurrency(data.summary.total_fees)} icon={<FiFileText className="w-4 h-4" />} color="blue" />
            <SummaryCard title="Total Tax" value={formatCurrency(data.summary.total_tax)} icon={<FiFileText className="w-4 h-4" />} color="orange" />
            <SummaryCard title="Total Invoices" value={data.summary.total_invoices.toString()} icon={<FiFileText className="w-4 h-4" />} color="purple" />
            <SummaryCard title="Items Sold" value={data.summary.total_items_sold.toString()} icon={<FiGrid className="w-4 h-4" />} color="pink" />
            <SummaryCard title="Avg per Service" value={formatCurrency(data.summary.avg_sales_per_service)} icon={<FiAward className="w-4 h-4" />} color="amber" />
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'chart' ? (
              <motion.div key="chart-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FiPieChart className="w-4 h-4 text-indigo-500" />
                        Sales Distribution by Service
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

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FiBarChart2 className="w-4 h-4 text-indigo-500" />
                        Sales & Fees Comparison
                      </h3>
                    </div>
                    <div className="h-80">
                      {barChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value, name) => [formatCurrency(value), name === 'sales' ? 'Total Sales' : name === 'fees' ? 'Service Fees' : 'Tax']} />
                            <Legend />
                            <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="fees" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="tax" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center"><p className="text-gray-400">No data available</p></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                    <FiTrendingUp className="w-4 h-4 text-indigo-500" />
                    Recent Sales Trend
                  </h3>
                  <div className="h-72">
                    {recentSalesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={recentSalesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `Date: ${label}`} />
                          <Area type="monotone" dataKey="amount" stroke="#6366f1" fillOpacity={1} fill="url(#colorAmount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center"><p className="text-gray-400">No recent sales data available</p></div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="table-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">All Services Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fees</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Invoices</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg/Item</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">GST</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.all_services.map((service, idx) => (
                          <tr key={service.service_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {service.service_name}
                              {service.percentage && <span className="ml-2 text-xs text-indigo-600">({parseFloat(service.percentage).toFixed(1)}%)</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{service.category_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatCurrency(service.total_sales)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(service.total_fees)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(service.total_tax)}</td>
                            <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{service.total_invoices}</span></td>
                            <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">{service.total_items_sold}</span></td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(service.avg_sales_per_item)}</td>
                            <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">{service.gst_rate}%</span></td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(service.last_sale_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Recent Sales Transactions</h3>
                    <span className="text-xs text-gray-400">Last {data.recent_sales.length} transactions</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Date</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fees</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoice Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recent_sales.map((sale) => (
                          <tr key={sale.invoice_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs text-indigo-600">{sale.invoice_no}</td>
                            <td className="px-4 py-3 text-gray-700">{sale.service_name}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(sale.sale_date)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(sale.fees)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(sale.tax)}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(sale.amount)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(sale.invoice_total)}</td>
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

export default ServiceSalesDetails;