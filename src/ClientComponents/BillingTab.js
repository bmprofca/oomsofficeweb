import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiDownload, FiEye, FiDollarSign, FiCalendar, FiCheckCircle, FiClock, FiTrendingUp, FiFileText, FiFilter, FiSearch, FiCreditCard, FiBarChart2, FiPrinter } from 'react-icons/fi';

const BillingTab = () => {
    const [invoices, setInvoices] = useState([
        { id: 1, invoice: "INV-001", date: "2024-01-15", amount: "15000", status: "Paid", dueDate: "2024-01-30", description: "Q3 Professional Services", client: "Venkatesh R", category: "Professional Fees", paymentMethod: "Bank Transfer" },
        { id: 2, invoice: "INV-002", date: "2024-01-10", amount: "8500", status: "Pending", dueDate: "2024-01-25", description: "Tax Consultation Services", client: "Ramappa Enterprises", category: "Consultation", paymentMethod: "Pending" },
        { id: 3, invoice: "INV-003", date: "2024-01-05", amount: "12000", status: "Paid", dueDate: "2024-01-20", description: "Annual Compliance Fees", client: "Banashankari Traders", category: "Compliance", paymentMethod: "Credit Card" },
        { id: 4, invoice: "INV-004", date: "2024-01-20", amount: "5000", status: "Overdue", dueDate: "2024-01-15", description: "Audit Services", client: "Venkatesh R", category: "Audit", paymentMethod: "Pending" },
        { id: 5, invoice: "INV-005", date: "2024-01-18", amount: "30000", status: "Paid", dueDate: "2024-02-18", description: "Company Registration", client: "Ramappa Enterprises", category: "Legal", paymentMethod: "Bank Transfer" }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = 
            inv.invoice.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.client.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
        const matchesDate = dateFilter === 'All' || 
            (dateFilter === 'This Month' && new Date(inv.date).getMonth() === new Date().getMonth()) ||
            (dateFilter === 'Last Month' && new Date(inv.date).getMonth() === new Date().getMonth() - 1);
        
        return matchesSearch && matchesStatus && matchesDate;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': 
                return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
            case 'Pending': 
                return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
            case 'Overdue': 
                return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200';
            default: 
                return 'bg-gradient-to-r from-gray-100 to-slate-100 text-slate-800 border border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Paid': return <FiCheckCircle className="w-4 h-4" />;
            case 'Pending': return <FiClock className="w-4 h-4" />;
            case 'Overdue': return <FiCalendar className="w-4 h-4" />;
            default: return <FiFileText className="w-4 h-4" />;
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Professional Fees': return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700';
            case 'Consultation': return 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700';
            case 'Compliance': return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700';
            case 'Audit': return 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700';
            case 'Legal': return 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700';
            default: return 'bg-gradient-to-r from-gray-50 to-slate-50 text-slate-700';
        }
    };

    const calculateFinancialStats = () => {
        const totalRevenue = invoices
            .filter(inv => inv.status === 'Paid')
            .reduce((sum, inv) => sum + parseInt(inv.amount), 0);
        
        const pendingAmount = invoices
            .filter(inv => inv.status === 'Pending')
            .reduce((sum, inv) => sum + parseInt(inv.amount), 0);
        
        const overdueAmount = invoices
            .filter(inv => inv.status === 'Overdue')
            .reduce((sum, inv) => sum + parseInt(inv.amount), 0);
        
        const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
        
        return { totalRevenue, pendingAmount, overdueAmount, paidCount };
    };

    const stats = calculateFinancialStats();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-xl p-6"
        >
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                        Billing & Invoicing
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">Manage invoices, payments, and financial tracking</p>
                </div>
                <div className="flex gap-3">
                    <motion.button
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-semibold"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiPlus className="w-5 h-5" />
                        New Invoice
                    </motion.button>
                    <motion.button
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 font-semibold"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiDownload className="w-5 h-5" />
                        Export Data
                    </motion.button>
                </div>
            </div>

            {/* Financial Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Total Revenue</p>
                            <p className="text-base font-bold text-slate-800 mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                            <FiTrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Pending Amount</p>
                            <p className="text-base font-bold text-slate-800 mt-1">₹{stats.pendingAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center">
                            <FiClock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Overdue</p>
                            <p className="text-base font-bold text-slate-800 mt-1">₹{stats.overdueAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-pink-100 rounded-xl flex items-center justify-center">
                            <FiCalendar className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Paid Invoices</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{stats.paidCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                            <FiCheckCircle className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by invoice number, client, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white"
                    >
                        <option value="All">All Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Overdue">Overdue</option>
                    </select>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white"
                    >
                        <option value="All">All Time</option>
                        <option value="This Month">This Month</option>
                        <option value="Last Month">Last Month</option>
                    </select>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Invoice Details
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Client & Description
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                            <FiFileText className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-800 mb-2">No invoices found</h3>
                                        <p className="text-slate-600">Try adjusting your search or filter criteria</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv, index) => (
                                    <motion.tr
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                                                        <FiFileText className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-800">{inv.invoice}</div>
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <FiCalendar className="w-3.5 h-3.5" />
                                                            Issued: {inv.date}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-xs">
                                                    <span className={`px-2 py-1 rounded-full ${getCategoryColor(inv.category)}`}>
                                                        {inv.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div className="font-medium text-slate-800">{inv.client}</div>
                                                <div className="text-sm text-slate-600 max-w-xs">{inv.description}</div>
                                                <div className="text-xs text-slate-500">
                                                    Due: {inv.dueDate} • {inv.paymentMethod}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                                                    <FiDollarSign className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="text-base font-bold text-slate-800">₹{parseInt(inv.amount).toLocaleString()}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {inv.status === 'Paid' ? 'Payment received' : 'Payment pending'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(inv.status)}
                                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(inv.status)}`}>
                                                    {inv.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <motion.button
                                                    className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 hover:shadow-md rounded-xl transition-all duration-200"
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </motion.button>
                                                <motion.button
                                                    className="p-2.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-600 hover:shadow-md rounded-xl transition-all duration-200"
                                                    whileHover={{ scale: 1.1, rotate: -5 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <FiDownload className="w-4 h-4" />
                                                </motion.button>
                                                <motion.button
                                                    className="p-2.5 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 hover:shadow-md rounded-xl transition-all duration-200"
                                                    whileHover={{ scale: 1.1, y: -2 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <FiPrinter className="w-4 h-4" />
                                                </motion.button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                {filteredInvoices.length > 0 && (
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-slate-600">
                                Showing <span className="font-semibold">{filteredInvoices.length}</span> of <span className="font-semibold">{invoices.length}</span> invoices • 
                                <span className="ml-2 font-semibold text-green-600">₹{stats.totalRevenue.toLocaleString()}</span> total revenue
                            </div>
                            <div className="flex items-center gap-3">
                                <motion.button
                                    className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg font-medium transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Previous
                                </motion.button>
                                <div className="flex gap-1">
                                    <button className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold">
                                        1
                                    </button>
                                    <button className="w-8 h-8 text-slate-600 hover:bg-white rounded-lg font-medium">
                                        2
                                    </button>
                                    <button className="w-8 h-8 text-slate-600 hover:bg-white rounded-lg font-medium">
                                        3
                                    </button>
                                </div>
                                <motion.button
                                    className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg font-medium transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Next
                                </motion.button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions & Summary */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                                <FiBarChart2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 mb-2">Revenue Insights</h4>
                                <p className="text-sm text-slate-600">
                                    <span className="font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</span> collected • 
                                    <span className="font-bold text-yellow-600 ml-3">₹{stats.pendingAmount.toLocaleString()}</span> pending • 
                                    <span className="font-bold text-red-600 ml-3">₹{stats.overdueAmount.toLocaleString()}</span> overdue
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <motion.button
                                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 font-semibold"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Send Reminders
                            </motion.button>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FiCreditCard className="w-5 h-5 text-blue-600" />
                        Payment Methods
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Bank Transfer</span>
                            <span className="font-semibold text-slate-800">60%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: '60%' }} />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Credit Card</span>
                            <span className="font-semibold text-slate-800">25%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600" style={{ width: '25%' }} />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Other</span>
                            <span className="font-semibold text-slate-800">15%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-600" style={{ width: '15%' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming Payments */}
            <div className="mt-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FiCalendar className="w-5 h-5 text-yellow-600" />
                        Upcoming Payments
                    </h4>
                    <motion.button
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        View All
                    </motion.button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {invoices
                        .filter(inv => inv.status === 'Pending')
                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                        .slice(0, 3)
                        .map(inv => (
                            <div key={inv.id} className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-800">{inv.invoice}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(inv.status)}`}>
                                        {inv.status}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-600 mb-2">{inv.client}</div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-800">₹{parseInt(inv.amount).toLocaleString()}</span>
                                    <span className="text-sm text-slate-500">Due: {inv.dueDate}</span>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </motion.div>
    );
};

export default BillingTab;