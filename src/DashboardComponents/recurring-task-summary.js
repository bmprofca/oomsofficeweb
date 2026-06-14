import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiPlus, FiRefreshCw, FiLoader, FiLayers, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";

// Status Badge Component
const RecurringTaskStatusBadge = ({ count, color, category, serviceId, navigate }) => (
    <div className="inline-block">
        {count > 0 ? (
            <motion.span 
                className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${color} shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/recurring-task/detailed?category=${category}&service_id=${serviceId}`);
                }}
            >
                {count}
            </motion.span>
        ) : (
            <span className="inline-flex items-center justify-center w-10 h-10 text-gray-400 text-sm">
                {count}
            </span>
        )}
    </div>
);

const RecurringTaskSummary = ({ onRefresh: externalRefresh }) => {
    const navigate = useNavigate();
    const [taskStats, setTaskStats] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch recurring task services list
    const fetchServices = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/recurring-task/services`, {
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setServices(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching recurring task templates:', error);
        }
    }, []);

    // Fetch recurring task summary
    const fetchTaskSummary = useCallback(async (serviceIds = []) => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/report/recurring-task-summary`;
            if (serviceIds.length > 0) {
                url += `?service_ids=${serviceIds.join(',')}`;
            }
            
            const response = await fetch(url, { headers: getHeaders() });
            const data = await response.json();
            
            if (data.success) {
                setTaskStats(data.data || []);
                setSummary(data.summary || null);
            }
        } catch (error) {
            console.error('Error fetching recurring task summary:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle service filter change
    const handleServiceFilterChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        const filteredIds = selectedOptions.filter(id => id !== "");
        setSelectedServiceIds(filteredIds);
        fetchTaskSummary(filteredIds);
    };

    // Handle refresh
    const handleRefresh = () => {
        fetchTaskSummary(selectedServiceIds);
        if (externalRefresh) externalRefresh();
    };

    // Handle select all services
    const handleSelectAll = () => {
        setSelectedServiceIds([]);
        fetchTaskSummary([]);
        const selectElement = document.getElementById('rt-service-select');
        if (selectElement) selectElement.value = "";
    };

    // Handle navigation to detailed view
    const navigateToTaskView = (status = 'ALL', serviceId = null) => {
        const params = new URLSearchParams();
        if (status) params.append('category', status);
        if (serviceId) params.append('service_id', serviceId);
        navigate(`/recurring-task/detailed?${params.toString()}`);
    };

    // Handle header click
    const handleHeaderClick = (status = 'ALL') => {
        const params = new URLSearchParams();
        if (status) params.append('category', status);
        navigate(`/recurring-task/detailed?${params.toString()}`);
    };

    useEffect(() => {
        fetchServices();
        fetchTaskSummary();
    }, [fetchServices, fetchTaskSummary]);

    // Click outside handler for dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            const dropdown = document.getElementById('rt-service-dropdown');
            const button = event.target.closest('button');
            if (dropdown && !dropdown.contains(event.target) && !button?.closest('.relative')) {
                dropdown.classList.add('hidden');
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Status color mapping
    const statusConfig = {
        OD: 'bg-gradient-to-br from-red-500 to-pink-600 text-white',
        DT: 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white',
        D7: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white',
        FT: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
        PFD: 'bg-gradient-to-br from-yellow-300 to-orange-400 text-white',
        PFC: 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white',
        CPL: 'bg-gradient-to-br from-green-400 to-emerald-500 text-white',
        OUT: 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white',
        NA: 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
    };

    return (
        <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                        <FiLayers className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Recurring Task Summary</h3>
                        <p className="text-gray-500">
                            Real-time recurring task tracking
                            {summary && (
                                <span className="ml-2 text-sm text-indigo-600 font-semibold">
                                    • Total Services: {summary.total_services} • Active Tasks: {summary.total_active_tasks}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <motion.button 
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {loading ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiRefreshCw className="w-5 h-5" />}
                    </motion.button>
                    
                    <div className="relative">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => document.getElementById('rt-service-dropdown')?.classList.toggle('hidden')}
                                    className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm flex items-center justify-between min-w-[250px] hover:bg-gray-50 transition-colors text-sm font-semibold"
                                >
                                    <span className="text-gray-700">
                                        {selectedServiceIds.length === 0 ? (
                                            "All Services"
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                                    {selectedServiceIds.length} selected
                                                </span>
                                            </span>
                                        )}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                <div 
                                    id="rt-service-dropdown"
                                    className="hidden absolute top-full left-0 mt-2 w-[300px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[400px] overflow-hidden"
                                >
                                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-700">Select Services</span>
                                            <button
                                                onClick={handleSelectAll}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="max-h-[300px] overflow-y-auto">
                                        <div className="p-2">
                                            <label className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedServiceIds.length === 0}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <span className="ml-3 text-sm font-semibold text-gray-700">All Services</span>
                                                <span className="ml-auto text-xs text-gray-500 font-medium">
                                                    {services.length} services
                                                </span>
                                            </label>
                                            
                                            <div className="border-t border-gray-100 my-2"></div>
                                            
                                            {services.map(service => (
                                                <label key={service.service_id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        value={service.service_id}
                                                        checked={selectedServiceIds.includes(String(service.service_id))}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            const isChecked = e.target.checked;
                                                            let newSelectedIds;
                                                            
                                                            if (isChecked) {
                                                                newSelectedIds = [...selectedServiceIds, value];
                                                            } else {
                                                                newSelectedIds = selectedServiceIds.filter(id => id !== value);
                                                            }
                                                            
                                                            setSelectedServiceIds(newSelectedIds);
                                                            fetchTaskSummary(newSelectedIds);
                                                        }}
                                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                    <div className="ml-3 flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-gray-800 truncate">{service.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">{service.service_id}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                                        <button
                                            onClick={() => document.getElementById('rt-service-dropdown')?.classList.add('hidden')}
                                            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <FiLoader className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full min-w-[1000px]">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th 
                                        className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick()}
                                    >
                                        SERVICE NAME
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('OD')}
                                    >
                                        OD
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('DT')}
                                    >
                                        DT
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('D7')}
                                    >
                                        D7
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('FT')}
                                    >
                                        FT
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('PFD')}
                                    >
                                        PFD
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('PFC')}
                                    >
                                        PFC
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('CPL')}
                                    >
                                        CPL
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('OUT')}
                                    >
                                        OUT
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('NA')}
                                    >
                                        NA
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {taskStats.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="text-center py-12 text-gray-500 font-medium">
                                            No recurring task summary stats found
                                        </td>
                                    </tr>
                                ) : (
                                    (isExpanded ? taskStats : taskStats.slice(0, 3)).map((service) => (
                                        <tr key={service.service_id} className="hover:bg-gray-50/50 transition-colors">
                                            <td 
                                                className="p-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                onClick={() => navigateToTaskView('ALL', service.service_id)}
                                            >
                                                <div className="font-semibold text-gray-800 text-sm">{service.service_name}</div>
                                                <div className="text-xs text-slate-405 mt-0.5">{service.service_type || 'compliance'} • {service.total_tasks} tasks</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.OD}
                                                    color={statusConfig.OD}
                                                    category="OD"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.DT}
                                                    color={statusConfig.DT}
                                                    category="DT"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.D7}
                                                    color={statusConfig.D7}
                                                    category="D7"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.FT}
                                                    color={statusConfig.FT}
                                                    category="FT"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.PFD}
                                                    color={statusConfig.PFD}
                                                    category="PFD"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.PFC}
                                                    color={statusConfig.PFC}
                                                    category="PFC"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.CPL}
                                                    color={statusConfig.CPL}
                                                    category="CPL"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.OUT}
                                                    color={statusConfig.OUT}
                                                    category="OUT"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <RecurringTaskStatusBadge
                                                    count={service.task_counts.NA}
                                                    color={statusConfig.NA}
                                                    category="NA"
                                                    serviceId={service.service_id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {taskStats.length > 3 && (
                        <div className="flex justify-center mt-5">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors duration-300 shadow-sm hover:shadow"
                            >
                                {isExpanded ? (
                                    <>
                                        Show Less <FiChevronUp className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        Show More ({taskStats.length - 3} More) <FiChevronDown className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RecurringTaskSummary;
