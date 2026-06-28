import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiPlus, FiRefreshCw, FiLoader, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";

// Updated TaskStatusBadge component with navigate
const TaskStatusBadge = ({ count, color, category, serviceId, navigate }) => (
    <div className="inline-block">
        {count > 0 ? (
            <motion.span 
                className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${color} shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/task/detailed?category=${category}&service_id=${serviceId}`);
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

const TaskSummary = ({ onRefresh: externalRefresh, onCreateTask }) => {
    const navigate = useNavigate();
    const [taskStats, setTaskStats] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [categoryLegend, setCategoryLegend] = useState({});
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch services list
    const fetchServices = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/service/list?search=&category_id`, {
                headers: getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setServices(data.data);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    }, []);

    // Fetch task summary
    const fetchTaskSummary = useCallback(async (serviceIds = []) => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/report/task-summary`;
            if (serviceIds.length > 0) {
                url += `?service_ids=${serviceIds.join(',')}`;
            }
            
            const response = await fetch(url, {
                headers: getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                const transformedData = data.data.map(service => ({
                    id: service.service_id,
                    name: service.service_name,
                    category: service.category_name,
                    task_kind: service.task_kind,
                    is_recurring: service.is_recurring,
                    service_type: service.service_type,
                    type: service.type,
                    OD: service.task_counts.OD || 0,
                    DT: service.task_counts.DT || 0,
                    D7: service.task_counts.D7 || 0,
                    FT: service.task_counts.FT || 0,
                    WIP: service.task_counts.WIP || 0,
                    PFC: service.task_counts.PFC || 0,
                    PFD: service.task_counts.PFD || 0,
                    CPL: service.task_counts.CPL || 0,
                    CNL: service.task_counts.CNL || 0,
                    total_tasks: service.total_tasks
                }));
                setTaskStats(transformedData);
                setSummary(data.summary);
                setCategoryLegend(data.category_legend || {});
            }
        } catch (error) {
            console.error('Error fetching task summary:', error);
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
        // Reset select element
        const selectElement = document.getElementById('service-select');
        if (selectElement) selectElement.value = "";
    };

    // Handle navigation to task view - updated with navigate
    const navigateToTaskView = (status = null, serviceId = null) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (serviceId) params.append('service_id', serviceId);
        if (selectedServiceIds.length > 0) {
            params.append('service_ids', selectedServiceIds.join(','));
        }
        navigate(`/task/view?${params.toString()}`);
    };

    // Handle header click - updated with navigate
    const handleHeaderClick = (status) => {
        const params = new URLSearchParams();
        if (selectedServiceIds.length > 0) {
            params.append('service_ids', selectedServiceIds.join(','));
        }
        if (status) params.append('status', status);
        navigate(`/task/view?${params.toString()}`);
    };

    useEffect(() => {
        fetchServices();
        fetchTaskSummary();
    }, [fetchServices, fetchTaskSummary]);

    // Add click outside handler for dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            const dropdown = document.getElementById('service-dropdown');
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
        WIP: 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white',
        PFC: 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white',
        PFD: 'bg-gradient-to-br from-yellow-300 to-orange-400 text-white',
        CPL: 'bg-gradient-to-br from-green-400 to-emerald-500 text-white',
        CNL: 'bg-gradient-to-br from-red-400 to-rose-500 text-white'
    };

    return (
        <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                        <FiCalendar className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Task Summary</h3>
                        <p className="text-gray-500">
                            Real-time task tracking
                            {summary && (
                                <span className="ml-2 text-sm">
                                    • Total Tasks: {summary.total_tasks} • Services: {summary.total_services}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <motion.button 
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-3 bg-gradient-to-br from-red-100 to-pink-100 text-red-600 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {loading ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiRefreshCw className="w-5 h-5" />}
                    </motion.button>
                    
                    <div className="relative">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => document.getElementById('service-dropdown')?.classList.toggle('hidden')}
                                    className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm flex items-center justify-between min-w-[250px] hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-gray-700">
                                        {selectedServiceIds.length === 0 ? (
                                            "All Services"
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-sm">
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
                                    id="service-dropdown"
                                    className="hidden absolute top-full left-0 mt-2 w-[300px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[400px] overflow-hidden"
                                >
                                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">Select Services</span>
                                            <button
                                                onClick={handleSelectAll}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
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
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                />
                                                <span className="ml-3 text-sm font-medium text-gray-700">All Services</span>
                                                <span className="ml-auto text-xs text-gray-500">
                                                    {services.length} services
                                                </span>
                                            </label>
                                            
                                            <div className="border-t border-gray-100 my-2"></div>
                                            
                                            {services.map(service => (
                                                <label key={service.service_id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        value={service.service_id}
                                                        checked={selectedServiceIds.includes(service.service_id.toString())}
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
                                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    />
                                                    <div className="ml-3 flex-1">
                                                        <div className="text-sm font-medium text-gray-800">{service.service_name}</div>
                                                        <div className="text-xs text-gray-500">{service.name}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                                        <button
                                            onClick={() => document.getElementById('service-dropdown')?.classList.add('hidden')}
                                            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {selectedServiceIds.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedServiceIds.slice(0, 3).map(id => {
                                        const service = services.find(s => s.service_id.toString() === id);
                                        return service ? (
                                            <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm">
                                                {service.service_name}
                                                <button
                                                    onClick={() => {
                                                        const newSelectedIds = selectedServiceIds.filter(sid => sid !== id);
                                                        setSelectedServiceIds(newSelectedIds);
                                                        fetchTaskSummary(newSelectedIds);
                                                    }}
                                                    className="hover:text-indigo-900 ml-1"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                    {selectedServiceIds.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                                            +{selectedServiceIds.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <motion.button 
                        onClick={onCreateTask}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FiPlus className="w-5 h-5" />
                        Create Task
                    </motion.button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <FiLoader className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th 
                                        className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick()}
                                    >
                                        SERVICE NAME
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('OD')}
                                    >
                                        OD
                                        {categoryLegend.OD && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.OD}
                                            </span>
                                        )}
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('DT')}
                                    >
                                        DT
                                        {categoryLegend.DT && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.DT}
                                            </span>
                                        )}
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('D7')}
                                    >
                                        D7
                                        {categoryLegend.D7 && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.D7}
                                            </span>
                                        )}
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('FT')}
                                    >
                                        FT
                                        {categoryLegend.FT && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.FT}
                                            </span>
                                        )}
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('WIP')}
                                    >
                                        WIP
                                        {categoryLegend.WIP && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.WIP}
                                            </span>
                                        )}
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('PFC')}
                                    >
                                        PFC
                                        {categoryLegend.PFC && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.PFC}
                                            </span>
                                        )}
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('PFD')}
                                    >
                                        PFD
                                        {categoryLegend.PFD && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.PFD}
                                            </span>
                                        )}
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('CPL')}
                                    >
                                        CPL
                                        {categoryLegend.CPL && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.CPL}
                                            </span>
                                        )}
                                    </th>
                                    <th 
                                        className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wider group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick('CNL')}
                                    >
                                        CNL
                                        {categoryLegend.CNL && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-10">
                                                {categoryLegend.CNL}
                                            </span>
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {taskStats.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="text-center py-12 text-gray-500">
                                            No tasks found
                                        </td>
                                    </tr>
                                ) : (
                                    (isExpanded ? taskStats : taskStats.slice(0, 3)).map((service) => {
                                        const isRecurring = service.task_kind === 'recurring' || 
                                                            service.is_recurring || 
                                                            String(service.service_type || '').toLowerCase() === 'compliance' || 
                                                            String(service.type || '').toLowerCase() === 'compliance';
                                        return (
                                            <tr key={service.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td 
                                                    className="p-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => navigateToTaskView(null, service.id)}
                                                >
                                                    <div className="font-semibold text-gray-800">
                                                        {isRecurring && <span className="text-red-500 font-bold mr-1.5">( C )</span>}
                                                        {service.name}
                                                    </div>
                                                <div className="text-sm text-gray-500">{service.category} • {service.total_tasks} tasks</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.OD}
                                                    color={statusConfig.OD}
                                                    category="OD"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.DT}
                                                    color={statusConfig.DT}
                                                    category="DT"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.D7}
                                                    color={statusConfig.D7}
                                                    category="D7"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.FT}
                                                    color={statusConfig.FT}
                                                    category="FT"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.WIP}
                                                    color={statusConfig.WIP}
                                                    category="WIP"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.PFC}
                                                    color={statusConfig.PFC}
                                                    category="PFC"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.PFD}
                                                    color={statusConfig.PFD}
                                                    category="PFD"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.CPL}
                                                    color={statusConfig.CPL}
                                                    category="CPL"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <TaskStatusBadge
                                                    count={service.CNL}
                                                    color={statusConfig.CNL}
                                                    category="CNL"
                                                    serviceId={service.id}
                                                    navigate={navigate}
                                                />
                                            </td>
                                        </tr>
                                        );
                                    })
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
                    
                    {summary && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold">Note:</span> {categoryLegend.note || "A task can be counted in multiple categories. For example, an 'in process' task with overdue due date will be counted in both WIP and OD."}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TaskSummary;