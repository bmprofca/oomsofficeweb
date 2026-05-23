import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiRepeat, FiCalendar, FiDollarSign, FiCheckCircle, FiPauseCircle, FiFilter, FiSearch, FiClock, FiTrendingUp, FiBell, FiRefreshCw } from 'react-icons/fi';

const RecurringTab = () => {
    const [services, setServices] = useState([
        { id: 1, service: "Monthly GST Filing", frequency: "Monthly", nextDue: "2024-02-10", amount: "2000", status: "Active", description: "Monthly GST return filing for GSTR-1 and 3B", category: "Tax", reminder: "3 days before", totalRevenue: "24000" },
        { id: 2, service: "Quarterly TDS", frequency: "Quarterly", nextDue: "2024-03-31", amount: "5000", status: "Active", description: "Quarterly TDS payment and return filing", category: "Tax", reminder: "7 days before", totalRevenue: "20000" },
        { id: 3, service: "Annual Compliance", frequency: "Yearly", nextDue: "2024-12-31", amount: "15000", status: "Inactive", description: "Annual business compliance and ROC filing", category: "Compliance", reminder: "30 days before", totalRevenue: "15000" },
        { id: 4, service: "Bookkeeping Services", frequency: "Monthly", nextDue: "2024-02-05", amount: "3000", status: "Active", description: "Monthly accounting and bookkeeping", category: "Accounting", reminder: "5 days before", totalRevenue: "36000" },
        { id: 5, service: "Payroll Processing", frequency: "Monthly", nextDue: "2024-02-07", amount: "4000", status: "Active", description: "Monthly payroll processing and PF filing", category: "HR", reminder: "2 days before", totalRevenue: "48000" }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [frequencyFilter, setFrequencyFilter] = useState('All');

    const filteredServices = services.filter(service => {
        const matchesSearch = 
            service.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.category.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || service.status === statusFilter;
        const matchesFrequency = frequencyFilter === 'All' || service.frequency === frequencyFilter;
        
        return matchesSearch && matchesStatus && matchesFrequency;
    });

    const toggleService = (id) => {
        setServices(services.map(service => 
            service.id === id ? { ...service, status: service.status === 'Active' ? 'Inactive' : 'Active' } : service
        ));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': 
                return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
            case 'Inactive': 
                return 'bg-gradient-to-r from-gray-100 to-slate-100 text-slate-800 border border-gray-200';
            default: 
                return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
        }
    };

    const getFrequencyColor = (frequency) => {
        switch (frequency) {
            case 'Monthly': 
                return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700';
            case 'Quarterly': 
                return 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700';
            case 'Yearly': 
                return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700';
            default: 
                return 'bg-gradient-to-r from-gray-50 to-slate-50 text-slate-700';
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Tax': return 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700';
            case 'Compliance': return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700';
            case 'Accounting': return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700';
            case 'HR': return 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700';
            default: return 'bg-gradient-to-r from-gray-50 to-slate-50 text-slate-700';
        }
    };

    const calculateServiceStats = () => {
        const totalServices = services.length;
        const activeServices = services.filter(s => s.status === 'Active').length;
        const inactiveServices = services.filter(s => s.status === 'Inactive').length;
        const monthlyRevenue = services
            .filter(s => s.status === 'Active')
            .reduce((sum, s) => {
                const monthlyAmount = s.frequency === 'Monthly' ? parseInt(s.amount) :
                                   s.frequency === 'Quarterly' ? parseInt(s.amount) / 3 :
                                   parseInt(s.amount) / 12;
                return sum + monthlyAmount;
            }, 0);
        
        return { totalServices, activeServices, inactiveServices, monthlyRevenue: Math.round(monthlyRevenue) };
    };

    const calculateTotalRevenue = () => {
        return services.reduce((sum, s) => sum + parseInt(s.totalRevenue), 0);
    };

    const stats = calculateServiceStats();
    const totalRevenue = calculateTotalRevenue();

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
                        Recurring Services Management
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">Automate and manage recurring client services efficiently</p>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-semibold"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiPlus className="w-5 h-5" />
                        Add Service
                    </motion.button>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Total Services</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{stats.totalServices}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                            <FiRepeat className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Active Services</p>
                            <p className="text-base font-bold text-slate-800 mt-1">{stats.activeServices}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                            <FiCheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Monthly Revenue</p>
                            <p className="text-base font-bold text-slate-800 mt-1">₹{stats.monthlyRevenue.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                            <FiTrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Total Revenue</p>
                            <p className="text-base font-bold text-slate-800 mt-1">₹{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                            <FiDollarSign className="w-6 h-6 text-purple-600" />
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
                        placeholder="Search services, descriptions, or categories..."
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
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <select
                        value={frequencyFilter}
                        onChange={(e) => setFrequencyFilter(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white"
                    >
                        <option value="All">All Frequencies</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Yearly">Yearly</option>
                    </select>
                </div>
            </div>

            {/* Services List */}
            <div className="space-y-4">
                {filteredServices.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                            <FiRepeat className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">No recurring services found</h3>
                        <p className="text-slate-600">Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    filteredServices.map((service, index) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white">
                                            <FiRepeat className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h4 className="text-base font-bold text-slate-800">{service.service}</h4>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(service.category)}`}>
                                                    {service.category}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getFrequencyColor(service.frequency)}`}>
                                                    {service.frequency}
                                                </span>
                                            </div>
                                            
                                            <p className="text-slate-600">{service.description}</p>
                                            
                                            <div className="flex flex-wrap items-center gap-6">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <FiCalendar className="w-4 h-4" />
                                                    <span className="font-medium">Next Due: <span className="text-slate-800">{service.nextDue}</span></span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <FiBell className="w-4 h-4" />
                                                    <span className="font-medium">Reminder: <span className="text-slate-800">{service.reminder}</span></span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <FiDollarSign className="w-4 h-4" />
                                                    <span className="font-medium">Amount: <span className="text-slate-800">₹{parseInt(service.amount).toLocaleString()}</span></span>
                                                </div>
                                            </div>
                                            
                                            <div className="pt-3 border-t border-gray-200">
                                                <div className="flex justify-between items-center">
                                                    <div className="text-sm text-slate-600">
                                                        Total Revenue: <span className="font-semibold text-slate-800">₹{parseInt(service.totalRevenue).toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        Service {service.status === 'Active' ? 'active' : 'paused'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        onClick={() => toggleService(service.id)}
                                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                                            service.status === 'Active' 
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25' 
                                                : 'bg-gradient-to-r from-gray-500 to-slate-600 text-white hover:shadow-lg hover:shadow-gray-500/25'
                                        }`}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {service.status === 'Active' ? <FiCheckCircle className="w-4 h-4" /> : <FiPauseCircle className="w-4 h-4" />}
                                        {service.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </motion.button>
                                    <motion.button
                                        className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 hover:shadow-md rounded-xl transition-all duration-200"
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <FiEdit className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Upcoming Services */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                            <FiCalendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800 mb-2">Upcoming Services</h4>
                            <p className="text-sm text-slate-600">
                                {services.filter(s => s.status === 'Active').length} active services • 
                                Next 7 days: {services.filter(s => {
                                    const dueDate = new Date(s.nextDue);
                                    const today = new Date();
                                    const nextWeek = new Date(today.setDate(today.getDate() + 7));
                                    return s.status === 'Active' && dueDate <= nextWeek;
                                }).length} services due
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <motion.button
                            className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 font-semibold"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Set Reminders
                        </motion.button>
                        <motion.button
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-semibold"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            View Calendar
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Frequency Distribution & Revenue Breakdown */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FiRepeat className="w-5 h-5 text-purple-600" />
                        Service Frequency Distribution
                    </h4>
                    <div className="space-y-3">
                        {Array.from(new Set(services.map(s => s.frequency))).map((frequency, index) => {
                            const frequencyCount = services.filter(s => s.frequency === frequency).length;
                            const percentage = (frequencyCount / services.length) * 100;
                            
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-700">{frequency}</span>
                                        <span className="font-semibold text-slate-800">{frequencyCount} services</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FiDollarSign className="w-5 h-5 text-green-600" />
                        Revenue by Category
                    </h4>
                    <div className="space-y-3">
                        {Array.from(new Set(services.map(s => s.category))).map((category, index) => {
                            const categoryRevenue = services
                                .filter(s => s.category === category)
                                .reduce((sum, s) => sum + parseInt(s.totalRevenue), 0);
                            const percentage = (categoryRevenue / totalRevenue) * 100;
                            
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-700">{category}</span>
                                        <span className="font-semibold text-slate-800">₹{categoryRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Service Performance */}
            <div className="mt-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FiTrendingUp className="w-5 h-5 text-blue-600" />
                        Service Performance Metrics
                    </h4>
                    <motion.button
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FiRefreshCw className="w-3 h-3" />
                        Refresh Data
                    </motion.button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                        <div className="text-sm text-slate-600">Active Service Rate</div>
                        <div className="text-base font-bold text-slate-800">
                            {((stats.activeServices / stats.totalServices) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {stats.activeServices} of {stats.totalServices} services active
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                        <div className="text-sm text-slate-600">Monthly Recurring Revenue</div>
                        <div className="text-base font-bold text-slate-800">₹{stats.monthlyRevenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-1">
                            Projected annual: ₹{(stats.monthlyRevenue * 12).toLocaleString()}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                        <div className="text-sm text-slate-600">Average Service Value</div>
                        <div className="text-base font-bold text-slate-800">
                            ₹{Math.round(totalRevenue / services.length).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            Per service per year
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default RecurringTab;