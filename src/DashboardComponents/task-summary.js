import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiPlus, FiRefreshCw, FiLoader } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import CustomSelect from '../components/CustomSelect';

const YetNotStartedCell = ({ value, serviceId, navigate }) => {
    if (value === false) {
        return (
            <span className="inline-flex items-center justify-center w-8 h-8 text-gray-400 text-[10px] font-semibold uppercase">
                N/A
            </span>
        );
    }

    const count = Number(value) || 0;
    if (count <= 0) {
        return (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-gray-400">
                {count}
            </span>
        );
    }

    return (
        <motion.span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
                e.stopPropagation();
                const params = new URLSearchParams();
                if (serviceId) params.set('service_id', serviceId);
                navigate(`/task/compliance/yet-not-started?${params.toString()}`);
            }}
            title="View yet not started compliance"
        >
            {count}
        </motion.span>
    );
};

const TaskStatusBadge = ({ count, color, category, serviceId, navigate }) => (
    <div className="inline-block">
        {count > 0 ? (
            <motion.span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${color} shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/task/detailed/${String(category).toLowerCase()}?service_id=${serviceId}`);
                }}
            >
                {count}
            </motion.span>
        ) : (
            <span className="inline-flex items-center justify-center w-8 h-8 text-gray-400 text-xs">
                {count}
            </span>
        )}
    </div>
);

const STATUS_COLUMNS = ['YNS', 'OD', 'DT', 'D7', 'FT', 'WIP', 'PFC', 'PFD'];
const TASK_TYPE_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'general', label: 'General' },
    { value: 'compliance', label: 'Compliance' },
];
const SKELETON_ROW_COUNT = 7;

const toServiceListType = (taskTypeFilter) => (
    taskTypeFilter === 'all' ? '' : taskTypeFilter
);

const buildTaskSummaryUrl = (selectedIds, taskTypeFilter) => {
    const params = new URLSearchParams();
    if (taskTypeFilter !== 'all') {
        params.set('type', taskTypeFilter);
    }
    if (selectedIds.length > 0) {
        params.set('service_ids', selectedIds.join(','));
    }
    const query = params.toString();
    return `${API_BASE_URL}/report/task-summary${query ? `?${query}` : ''}`;
};

const fetchBranchServicesFromApi = async (type = '', signal) => {
    const headers = getHeaders();
    const collected = [];
    let page = 1;
    let hasMore = true;
    const typeParam = type ? `&type=${encodeURIComponent(type)}` : '&type=';

    while (hasMore) {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const response = await fetch(
            `${API_BASE_URL}/service/list?search=&page_no=${page}&limit=100&added_only=true${typeParam}`,
            { headers, signal }
        );
        const data = await response.json();
        if (!data.success) break;

        collected.push(...(data.data || []));
        hasMore = data.pagination?.is_last_page === false;
        page += 1;
    }

    return collected;
};

const TaskSummaryTableSkeleton = () => (
    <div className="rounded-lg border border-gray-100 overflow-hidden min-w-0">
        <table className="w-full table-fixed">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                    <th className="px-2 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                    {STATUS_COLUMNS.map((status) => (
                        <th key={status} className="px-1 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">
                            {status}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
                {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                        <td className="px-2 py-3 text-center">
                            <div className="h-3 bg-gray-200 rounded w-4 mx-auto" />
                        </td>
                        <td className="px-2 py-3">
                            <div className="h-3.5 bg-gray-200 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </td>
                        {STATUS_COLUMNS.map((status) => (
                            <td key={status} className="px-1 py-3 text-center">
                                <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto" />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TaskSummary = ({ onRefresh: externalRefresh, onCreateTask }) => {
    const navigate = useNavigate();
    const [taskStats, setTaskStats] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);
    const [taskTypeFilter, setTaskTypeFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [categoryLegend, setCategoryLegend] = useState({});
    const prevTypeFilterRef = useRef(taskTypeFilter);
    const prevSelectedIdsRef = useRef(selectedServiceIds);
    const taskSummaryAbortRef = useRef(null);
    const taskSummaryRequestIdRef = useRef(0);
    const servicesAbortRef = useRef(null);
    const servicesRequestIdRef = useRef(0);

    const serviceTypeById = useMemo(() => {
        const map = new Map();
        services.forEach((service) => {
            map.set(String(service.service_id), String(service.type || 'general').toLowerCase());
        });
        return map;
    }, [services]);

    const fetchServices = useCallback(async (type = '') => {
        if (servicesAbortRef.current) {
            servicesAbortRef.current.abort();
        }

        const abortController = new AbortController();
        servicesAbortRef.current = abortController;
        const requestId = ++servicesRequestIdRef.current;

        setServicesLoading(true);
        try {
            const branchServices = await fetchBranchServicesFromApi(type, abortController.signal);
            if (requestId !== servicesRequestIdRef.current) {
                return;
            }

            const merged = branchServices
                .filter((service) => service.is_added !== false)
                .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            setServices(merged);
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            console.error('Error fetching services:', error);
            if (requestId === servicesRequestIdRef.current) {
                setServices([]);
            }
        } finally {
            if (requestId === servicesRequestIdRef.current) {
                setServicesLoading(false);
            }
        }
    }, []);

    const fetchTaskSummary = useCallback(async (selectedIds = [], typeFilter = 'all') => {
        if (taskSummaryAbortRef.current) {
            taskSummaryAbortRef.current.abort();
        }

        const abortController = new AbortController();
        taskSummaryAbortRef.current = abortController;
        const requestId = ++taskSummaryRequestIdRef.current;

        setLoading(true);
        try {
            const url = buildTaskSummaryUrl(selectedIds, typeFilter);
            const response = await fetch(url, {
                headers: getHeaders(),
                signal: abortController.signal,
            });
            const data = await response.json();

            if (requestId !== taskSummaryRequestIdRef.current) {
                return;
            }

            if (data.success) {
                const transformedData = data.data.map(service => ({
                    id: service.service_id,
                    name: service.service_name,
                    category: service.category_name,
                    task_kind: service.task_kind,
                    is_recurring: service.is_recurring,
                    service_type: service.service_type,
                    type: service.type,
                    YNS: service.task_counts.yet_no_started,
                    OD: service.task_counts.OD || 0,
                    DT: service.task_counts.DT || 0,
                    D7: service.task_counts.D7 || 0,
                    FT: service.task_counts.FT || 0,
                    WIP: service.task_counts.WIP || 0,
                    PFC: service.task_counts.PFC || 0,
                    PFD: service.task_counts.PFD || 0,
                }));
                setTaskStats(transformedData);
                setCategoryLegend(data.category_legend || {});
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            console.error('Error fetching task summary:', error);
        } finally {
            if (requestId === taskSummaryRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, []);

    const loadTaskSummary = useCallback((selectedIds = [], typeFilter = taskTypeFilter) => {
        fetchTaskSummary(selectedIds, typeFilter);
    }, [fetchTaskSummary, taskTypeFilter]);

    const handleRefresh = () => {
        loadTaskSummary(selectedServiceIds, taskTypeFilter);
        if (externalRefresh) externalRefresh();
    };

    const handleServiceSelectChange = (nextSelected) => {
        const ids = Array.isArray(nextSelected)
            ? nextSelected.map((option) => String(option.value))
            : [];
        setSelectedServiceIds(ids);
    };

    const handleTaskTypeFilterChange = (nextType) => {
        setTaskTypeFilter(nextType);
        setSelectedServiceIds([]);
    };

    const navigateToTaskView = (status = null, serviceId = null) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (serviceId) params.append('service_id', serviceId);
        if (taskTypeFilter !== 'all') {
            params.append('type', taskTypeFilter);
        }
        if (selectedServiceIds.length > 0) {
            params.append('service_ids', selectedServiceIds.join(','));
        }
        navigate(`/task/view?${params.toString()}`);
    };

    const handleHeaderClick = (status) => {
        const params = new URLSearchParams();
        if (taskTypeFilter !== 'all') {
            params.append('type', taskTypeFilter);
        }
        if (selectedServiceIds.length > 0) {
            params.append('service_ids', selectedServiceIds.join(','));
        }
        if (status) params.append('status', status);
        navigate(`/task/view?${params.toString()}`);
    };

    useEffect(() => {
        loadTaskSummary([], 'all');
        fetchServices('');

        return () => {
            taskSummaryAbortRef.current?.abort();
            servicesAbortRef.current?.abort();
        };
    }, [fetchServices, loadTaskSummary]);

    useEffect(() => {
        const typeChanged = prevTypeFilterRef.current !== taskTypeFilter;
        const selectedChanged = prevSelectedIdsRef.current !== selectedServiceIds;
        prevTypeFilterRef.current = taskTypeFilter;
        prevSelectedIdsRef.current = selectedServiceIds;

        if (!typeChanged && !selectedChanged) {
            return;
        }

        if (typeChanged) {
            fetchServices(toServiceListType(taskTypeFilter));
        }
        loadTaskSummary(selectedServiceIds, taskTypeFilter);
    }, [taskTypeFilter, selectedServiceIds, fetchServices, loadTaskSummary]);

    const serviceSelectOptions = useMemo(
        () => services.map((service) => ({
            value: String(service.service_id),
            label: service.name || 'Unnamed service',
            serviceType: String(service.type || 'general').toLowerCase(),
        })),
        [services]
    );

    const selectedServiceOptions = useMemo(
        () => serviceSelectOptions.filter((option) => selectedServiceIds.includes(option.value)),
        [serviceSelectOptions, selectedServiceIds]
    );

    const selectedTypeOption = useMemo(
        () => TASK_TYPE_OPTIONS.find((option) => option.value === taskTypeFilter) || TASK_TYPE_OPTIONS[0],
        [taskTypeFilter]
    );

    const statusConfig = {
        OD: 'bg-gradient-to-br from-red-500 to-pink-600 text-white',
        DT: 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white',
        D7: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white',
        FT: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
        WIP: 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white',
        PFC: 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white',
        PFD: 'bg-gradient-to-br from-yellow-300 to-orange-400 text-white',
    };

    const renderServiceOption = (option, { isSelected }) => (
        <>
            <input
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                checked={isSelected}
                readOnly
                tabIndex={-1}
            />
            <span className="text-sm leading-snug break-words whitespace-normal text-left">
                {option.serviceType === 'compliance' && (
                    <span className="text-red-500 font-bold mr-1">(C)</span>
                )}
                {option.label}
            </span>
        </>
    );

    return (
        <div className="p-3 min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex-shrink-0">
                        <FiCalendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-800">Task Summary</h3>
                        <p className="text-sm text-gray-500 truncate">Real-time task tracking</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <motion.button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-2 bg-gradient-to-br from-red-100 to-pink-100 text-red-600 rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {loading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiRefreshCw className="w-4 h-4" />}
                    </motion.button>

                    <div className="w-[220px] min-w-[180px]">
                        <CustomSelect
                            isMulti
                            options={serviceSelectOptions}
                            value={selectedServiceOptions}
                            onChange={handleServiceSelectChange}
                            placeholder={servicesLoading ? 'Loading services...' : 'All Services'}
                            searchPlaceholder="Search services..."
                            noOptionsMessage={servicesLoading ? 'Loading services...' : 'No branch services found'}
                            isDisabled={servicesLoading}
                            isClearable
                            renderOption={renderServiceOption}
                        />
                    </div>

                    <div className="w-[140px] min-w-[130px]">
                        <CustomSelect
                            options={TASK_TYPE_OPTIONS}
                            value={selectedTypeOption}
                            onChange={(option) => handleTaskTypeFilterChange(option?.value || 'all')}
                            placeholder="Type"
                            isSearchable={false}
                            isClearable={false}
                        />
                    </div>

                    <motion.button
                        onClick={onCreateTask}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-md transition-all duration-200 text-sm font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FiPlus className="w-4 h-4" />
                        Create Task
                    </motion.button>
                </div>
            </div>

            {loading ? (
                <TaskSummaryTableSkeleton />
            ) : (
                <div className="rounded-lg border border-gray-100 overflow-hidden min-w-0">
                    <table className="w-full table-fixed">
                        <colgroup>
                            <col style={{ width: '6%' }} />
                            <col style={{ width: '24%' }} />
                            {STATUS_COLUMNS.map((status) => (
                                <col key={status} style={{ width: `${70 / STATUS_COLUMNS.length}%` }} />
                            ))}
                        </colgroup>
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                                <th className="text-center px-1 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wide">
                                    #
                                </th>
                                <th
                                    className="text-left px-2 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wide cursor-pointer hover:text-indigo-600 transition-colors"
                                    onClick={() => handleHeaderClick()}
                                >
                                    Service
                                </th>
                                {STATUS_COLUMNS.map((status) => (
                                    <th
                                        key={status}
                                        className="text-center px-1 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wide group relative cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => handleHeaderClick(status)}
                                    >
                                        {status}
                                        {(categoryLegend[status] || (status === 'YNS' && categoryLegend.yet_no_started)) && (
                                            <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap z-20">
                                                {categoryLegend[status] || categoryLegend.yet_no_started}
                                            </span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {taskStats.length === 0 ? (
                                <tr>
                                    <td colSpan={STATUS_COLUMNS.length + 2} className="text-center py-10 text-sm text-gray-500">
                                        No tasks found
                                    </td>
                                </tr>
                            ) : (
                                taskStats.map((service, index) => {
                                    const isCompliance =
                                        serviceTypeById.get(String(service.id)) === 'compliance' ||
                                        String(service.service_type || '').toLowerCase() === 'compliance';
                                    return (
                                        <tr key={service.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-1 py-2.5 text-center text-sm text-gray-500 font-medium align-middle">
                                                {index + 1}
                                            </td>
                                            <td
                                                className="px-2 py-2.5 cursor-pointer hover:text-indigo-600 transition-colors align-top"
                                                onClick={() => navigateToTaskView(null, service.id)}
                                            >
                                                <div className="font-semibold text-gray-800 text-sm break-words whitespace-normal leading-snug">
                                                    {isCompliance && <span className="text-red-500 font-bold mr-1">(C)</span>}
                                                    {service.name}
                                                </div>
                                                {service.category && (
                                                    <div className="text-xs text-gray-500 break-words whitespace-normal leading-snug mt-0.5">
                                                        {service.category}
                                                    </div>
                                                )}
                                            </td>
                                            {STATUS_COLUMNS.map((status) => (
                                                <td key={status} className="px-1 py-2.5 text-center align-middle">
                                                    {status === 'YNS' ? (
                                                        <YetNotStartedCell
                                                            value={service.YNS}
                                                            serviceId={service.id}
                                                            navigate={navigate}
                                                        />
                                                    ) : (
                                                        <TaskStatusBadge
                                                            count={service[status]}
                                                            color={statusConfig[status]}
                                                            category={status}
                                                            serviceId={service.id}
                                                            navigate={navigate}
                                                        />
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TaskSummary;
