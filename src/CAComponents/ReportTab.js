import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiBarChart2,
    FiBriefcase,
    FiCalendar,
    FiCheckCircle,
    FiFilter,
    FiLayers,
    FiPhone,
    FiRefreshCw,
    FiSearch,
    FiUser,
    FiX,
} from 'react-icons/fi';
import axios from 'axios';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { fetchCaReportByService } from '../services/caService';
import {
    getCurrentComplianceYear,
    getPeriodOptions,
    normalizeFrequency,
} from '../services/complianceService';
import CustomSelect from '../components/CustomSelect';
import TablePagination from '../components/TablePagination';
import FirmsDetailsModal from '../components/Modals/FirmsDetailsModal';
import { optionByValue } from '../utils/customSelectHelpers';
import { DateRangePickerField } from '../components/PortalDatePicker';
import useDebouncedValue from '../hooks/useDebouncedValue';

const TASK_TYPE_OPTIONS = [
    { value: '', label: 'All services' },
    { value: 'general', label: 'General' },
    { value: 'compliance', label: 'Compliance' },
];

const STATUS_OPTIONS = [
    { value: 'in process', label: 'In Process' },
    { value: 'pending from client', label: 'Pending from Client' },
    { value: 'pending from department', label: 'Pending from Department' },
    { value: 'complete', label: 'Complete' },
    { value: 'cancel', label: 'Cancel' },
];

const STATUS_COLORS = {
    'in process': 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    'pending from client': 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    'pending from department': 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    complete: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cancel: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

const getStatusLabel = (status) =>
    STATUS_OPTIONS.find((option) => option.value === status)?.label || status || '—';

const SkeletonPulse = ({ className = '' }) => (
    <div className={`animate-pulse rounded-md bg-gradient-to-r from-slate-200/80 to-slate-100/80 ${className}`} />
);

const formatDate = (value) => {
    if (!value) return '—';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const formatMobile = (countryCode, mobile) => {
    const digits = String(mobile || '').trim();
    if (!digits) return '';
    const code = String(countryCode || '').trim();
    return code ? `${code} ${digits}` : digits;
};

const buildCompliancePeriodOptions = (service) => {
    if (!service) return null;
    const freq = normalizeFrequency(service.frequency);
    if (freq === 'yearly') {
        return { period_select_enabled: false, periods: [], frequency: freq };
    }
    return {
        frequency: freq,
        period_select_enabled: true,
        periods: getPeriodOptions(service.frequency).map((period) => ({
            value: period,
            label: period,
        })),
    };
};

const buildModalFirmFromRow = (row) => ({
    firm_id: row.firm_id,
    firm_name: row.firm_name,
    firm_type: row.firm_type,
    status: row.firm_status === '1' || row.firm_status === 1,
    file_no: row.firm_file_no,
    pan_no: row.firm_pan,
    pan: row.firm_pan,
    gst_no: row.firm_gst,
    gst: row.firm_gst,
    tan: row.firm_tan,
    vat: row.firm_vat,
    cin: row.firm_cin,
    create_date: row.firm_create_date,
    address: {
        address_line_1: row.firm_address_line_1,
        address_line_2: row.firm_address_line_2,
        city: row.firm_city,
        state: row.firm_state,
        country: row.firm_country,
        pincode: row.firm_pincode,
    },
});

const fetchBranchServices = async (type = '', signal) => {
    const headers = getHeaders();
    const collected = [];
    let page = 1;
    let hasMore = true;
    const typeParam = type ? `&type=${encodeURIComponent(type)}` : '&type=';

    while (hasMore) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
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

    return collected
        .filter((service) => service.is_added !== false)
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
};

const fetchFirmOptions = async (signal) => {
    const headers = getHeaders();
    const collected = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const response = await axios.get(`${API_BASE_URL}/firm/list`, {
            headers,
            params: { page_no: page, limit: 100, search: '' },
            signal,
        });
        const rows = response.data?.data || [];
        collected.push(...rows);
        hasMore = response.data?.pagination?.is_last_page === false;
        page += 1;
    }

    return collected.map((firm) => ({
        value: String(firm.firm_id),
        label: firm.firm_name || 'Unnamed firm',
        pan: firm.pan_no || firm.profile_pan_number || '',
    }));
};

const SummaryCard = ({ icon: Icon, label, value, accent }) => (
    <div className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm ${accent.border}`}>
        <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-20 ${accent.glow}`} />
        <div className="relative flex items-start justify-between gap-3">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${accent.text}`}>{value ?? 0}</p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.iconBg}`}>
                <Icon className={`h-5 w-5 ${accent.iconText}`} />
            </div>
        </div>
    </div>
);

const ReportTableSkeleton = ({ rowCount = 8 }) => (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Loading report">
        <table className="min-w-full text-sm">
            <thead>
                <tr className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/60">
                    {['#', 'Service', 'Firm', 'Client', 'Status', 'Completed'].map((col) => (
                        <th key={col} className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-indigo-900/70">
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {Array.from({ length: rowCount }, (_, i) => (
                    <tr key={i}>
                        <td className="px-4 py-3.5"><SkeletonPulse className="h-4 w-5" /></td>
                        <td className="px-4 py-3.5"><SkeletonPulse className="h-8 w-36" /></td>
                        <td className="px-4 py-3.5"><SkeletonPulse className="h-8 w-32" /></td>
                        <td className="px-4 py-3.5"><SkeletonPulse className="h-8 w-28" /></td>
                        <td className="px-4 py-3.5"><SkeletonPulse className="h-5 w-24 rounded-full" /></td>
                        <td className="px-4 py-3.5"><SkeletonPulse className="h-4 w-24" /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default function ReportTab({ caUsername: caUsernameProp } = {}) {
    const navigate = useNavigate();
    const caUsername =
        caUsernameProp != null && String(caUsernameProp).trim() !== ''
            ? String(caUsernameProp).trim()
            : '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1,
        is_last_page: true,
    });

    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [firms, setFirms] = useState([]);
    const [firmsLoading, setFirmsLoading] = useState(true);

    const [serviceType, setServiceType] = useState('');
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [firmId, setFirmId] = useState('');
    const [completeDateRange, setCompleteDateRange] = useState({ start: '', end: '' });
    const [complianceYear, setComplianceYear] = useState('');
    const [compliancePeriod, setCompliancePeriod] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [showFilters, setShowFilters] = useState(true);
    const [firmModal, setFirmModal] = useState({ open: false, firm: null, clientName: '' });

    const debouncedSearch = useDebouncedValue(searchTerm, 400);
    const reportAbortRef = useRef(null);
    const servicesAbortRef = useRef(null);

    const yearOptions = useMemo(() => {
        const currentStart = Number(getCurrentComplianceYear().split('-')[0]);
        return Array.from({ length: 5 }, (_, index) => {
            const start = currentStart - 2 + index;
            return `${start}-${start + 1}`;
        });
    }, []);

    const yearSelectOptions = useMemo(
        () => yearOptions.map((year) => ({ value: year, label: year })),
        [yearOptions]
    );

    const loadServices = useCallback(async (type = '') => {
        servicesAbortRef.current?.abort();
        const ac = new AbortController();
        servicesAbortRef.current = ac;
        setServicesLoading(true);
        try {
            const list = await fetchBranchServices(type, ac.signal);
            if (!ac.signal.aborted) setServices(list);
        } catch (e) {
            if (e?.name !== 'AbortError') setServices([]);
        } finally {
            if (!ac.signal.aborted) setServicesLoading(false);
        }
    }, []);

    const loadFirms = useCallback(async () => {
        const ac = new AbortController();
        setFirmsLoading(true);
        try {
            const list = await fetchFirmOptions(ac.signal);
            if (!ac.signal.aborted) setFirms(list);
        } catch {
            if (!ac.signal.aborted) setFirms([]);
        } finally {
            if (!ac.signal.aborted) setFirmsLoading(false);
        }
    }, []);

    const selectedServices = useMemo(
        () => services.filter((service) => selectedServiceIds.includes(String(service.service_id))),
        [services, selectedServiceIds]
    );

    const selectedComplianceServices = useMemo(
        () => selectedServices.filter(
            (service) => String(service.type || '').toLowerCase() === 'compliance'
        ),
        [selectedServices]
    );

    const periodSourceService = useMemo(() => {
        if (selectedComplianceServices.length === 1) return selectedComplianceServices[0];
        if (serviceType === 'compliance' && selectedComplianceServices.length === 0 && services.length === 1) {
            return services[0];
        }
        return null;
    }, [selectedComplianceServices, serviceType, services]);

    const periodOptions = useMemo(
        () => buildCompliancePeriodOptions(periodSourceService),
        [periodSourceService]
    );

    const showComplianceFilters = serviceType !== 'general';
    const periodFilterEnabled = Boolean(
        periodOptions?.period_select_enabled && complianceYear
    );

    const fetchReport = useCallback(async () => {
        if (!caUsername) {
            setError('CA username is required to load the report.');
            setRows([]);
            setSummary(null);
            setLoading(false);
            return;
        }

        reportAbortRef.current?.abort();
        const ac = new AbortController();
        reportAbortRef.current = ac;

        setLoading(true);
        setError('');
        try {
            const result = await fetchCaReportByService({
                username: caUsername,
                serviceIds: selectedServiceIds,
                type: serviceType,
                firmId,
                statuses: selectedStatuses,
                fromDate: completeDateRange.start || '',
                toDate: completeDateRange.end || '',
                complianceYear: showComplianceFilters ? (complianceYear || '') : '',
                compliancePeriod:
                    showComplianceFilters && periodFilterEnabled
                        ? (compliancePeriod || '')
                        : '',
                search: debouncedSearch.trim(),
                pageNo: page,
                limit,
                signal: ac.signal,
            });

            if (ac.signal.aborted) return;

            if (!result?.success) {
                throw new Error(result?.message || 'Failed to load report');
            }

            setRows(Array.isArray(result.data) ? result.data : []);
            setSummary(result.summary || null);
            setPagination(result.pagination || {
                page: 1,
                limit,
                total: 0,
                total_pages: 1,
                is_last_page: true,
            });
        } catch (e) {
            if (e?.name === 'AbortError') return;
            console.error('CA report:', e);
            setError(e?.response?.data?.message || e.message || 'Failed to load report');
            setRows([]);
            setSummary(null);
        } finally {
            if (reportAbortRef.current === ac) setLoading(false);
        }
    }, [
        caUsername,
        selectedServiceIds,
        serviceType,
        firmId,
        selectedStatuses,
        completeDateRange,
        complianceYear,
        compliancePeriod,
        showComplianceFilters,
        periodFilterEnabled,
        debouncedSearch,
        page,
        limit,
    ]);

    useEffect(() => {
        loadServices(serviceType);
        loadFirms();
        return () => {
            servicesAbortRef.current?.abort();
            reportAbortRef.current?.abort();
        };
    }, [loadServices, loadFirms, serviceType]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    useEffect(() => {
        setPage(1);
    }, [
        serviceType,
        selectedServiceIds,
        selectedStatuses,
        firmId,
        completeDateRange,
        complianceYear,
        compliancePeriod,
        debouncedSearch,
        limit,
    ]);

    useEffect(() => {
        setCompliancePeriod('');
    }, [complianceYear, periodSourceService?.service_id]);

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

    const selectedStatusOptions = useMemo(
        () => STATUS_OPTIONS.filter((option) => selectedStatuses.includes(option.value)),
        [selectedStatuses]
    );

    const firmOptions = useMemo(
        () => [{ value: '', label: 'All firms', pan: '' }, ...firms],
        [firms]
    );

    const periodSelectOptions = useMemo(
        () => (periodOptions?.periods || []).map((period) => ({
            value: String(period.value),
            label: period.label || period.value,
        })),
        [periodOptions]
    );

    const clearFilters = () => {
        setServiceType('');
        setSelectedServiceIds([]);
        setSelectedStatuses([]);
        setFirmId('');
        setCompleteDateRange({ start: '', end: '' });
        setComplianceYear('');
        setCompliancePeriod('');
        setSearchTerm('');
        setPage(1);
    };

    const hasActiveFilters =
        serviceType ||
        selectedServiceIds.length > 0 ||
        selectedStatuses.length > 0 ||
        firmId ||
        completeDateRange.start ||
        completeDateRange.end ||
        complianceYear ||
        compliancePeriod ||
        searchTerm.trim();

    const handleServiceSelectChange = (nextSelected) => {
        const ids = Array.isArray(nextSelected)
            ? nextSelected.map((option) => String(option.value))
            : [];
        setSelectedServiceIds(ids);
        setCompliancePeriod('');
    };

    const handleStatusSelectChange = (nextSelected) => {
        const values = Array.isArray(nextSelected)
            ? nextSelected.map((option) => String(option.value))
            : [];
        setSelectedStatuses(values);
    };

    const renderServiceOption = (option, { isSelected }) => (
        <>
            <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={isSelected}
                readOnly
                tabIndex={-1}
            />
            <span className="text-left text-sm leading-snug">
                {option.serviceType === 'compliance' && (
                    <span className="mr-1 font-bold text-red-500">(C)</span>
                )}
                {option.label}
            </span>
        </>
    );

    const renderFirmOption = (option) => {
        if (!option.value) {
            return <span className="text-sm text-slate-700">{option.label}</span>;
        }
        return (
            <div className="min-w-0 text-left">
                <div className="truncate text-sm font-medium text-slate-900">{option.label}</div>
                {option.pan ? (
                    <div className="truncate text-xs text-slate-500">PAN: {option.pan}</div>
                ) : (
                    <div className="text-xs text-slate-400">PAN: —</div>
                )}
            </div>
        );
    };

    const formatPeriodLabel = (row) => {
        if (String(row.service_type || '').toLowerCase() !== 'compliance') return '';
        const year = row.compliance_year || '';
        const period = row.compliance_period || '';
        if (year && period) return `${year} · ${period}`;
        if (year) return year;
        if (period) return period;
        return '';
    };

    const openFirmModal = (row) => {
        if (!row?.firm_id) return;
        setFirmModal({
            open: true,
            firm: buildModalFirmFromRow(row),
            clientName: row.client_name || row.client_username || '',
        });
    };

    const rowOffset = (pagination.page - 1) * pagination.limit;

    return (
        <div className="overflow-hidden rounded-2xl border border-indigo-100/80 bg-white shadow-lg shadow-indigo-100/40">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-indigo-100 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-4 py-5 sm:px-6">
                <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-white/5" />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
                            <FiBarChart2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Report by Service</h3>
                            <p className="text-sm text-indigo-100">
                                Tasks assigned to this CA — filter, review, and drill down
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowFilters((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                        >
                            <FiFilter className="h-4 w-4" />
                            {showFilters ? 'Hide filters' : 'Show filters'}
                        </button>
                        <motion.button
                            type="button"
                            onClick={fetchReport}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-md transition hover:bg-indigo-50 disabled:opacity-60"
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                        >
                            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </motion.button>
                    </div>
                </div>

                {showFilters && (
                    <div className="relative mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                <FiLayers className="h-3.5 w-3.5" /> Service type
                            </label>
                            <CustomSelect
                                value={optionByValue(TASK_TYPE_OPTIONS, serviceType)}
                                onChange={(opt) => {
                                    setServiceType(opt?.value || '');
                                    setSelectedServiceIds([]);
                                    setComplianceYear('');
                                    setCompliancePeriod('');
                                }}
                                options={TASK_TYPE_OPTIONS}
                                placeholder="All services"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                Services
                            </label>
                            <CustomSelect
                                isMulti
                                options={serviceSelectOptions}
                                value={selectedServiceOptions}
                                onChange={handleServiceSelectChange}
                                placeholder={servicesLoading ? 'Loading services…' : 'All services'}
                                searchPlaceholder="Search services…"
                                noOptionsMessage={servicesLoading ? 'Loading services…' : 'No services found'}
                                isDisabled={servicesLoading}
                                isClearable
                                renderOption={renderServiceOption}
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                Status
                            </label>
                            <CustomSelect
                                isMulti
                                options={STATUS_OPTIONS}
                                value={selectedStatusOptions}
                                onChange={handleStatusSelectChange}
                                placeholder="All statuses"
                                searchPlaceholder="Search statuses…"
                                isClearable
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                <FiBriefcase className="h-3.5 w-3.5" /> Firm
                            </label>
                            <CustomSelect
                                value={optionByValue(firmOptions, firmId)}
                                onChange={(opt) => setFirmId(opt?.value || '')}
                                options={firmOptions}
                                placeholder={firmsLoading ? 'Loading firms…' : 'All firms'}
                                searchPlaceholder="Search firm name or PAN…"
                                isDisabled={firmsLoading}
                                renderOption={renderFirmOption}
                            />
                        </div>

                        <div className="md:col-span-2 xl:col-span-1">
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                <FiCalendar className="h-3.5 w-3.5" /> Complete date range
                            </label>
                            <DateRangePickerField
                                value={completeDateRange}
                                onChange={(range) => setCompleteDateRange({
                                    start: range?.start || '',
                                    end: range?.end || '',
                                })}
                                placeholder="Select complete date range"
                                mode="range"
                                initialTab="quick"
                                defaultQuickKey="tm"
                                quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']}
                                showRangeHint={false}
                                showResetButton
                                buttonClassName="w-full px-3.5 py-2 bg-white border border-white/30 rounded-xl text-sm text-slate-700 hover:border-white/60 focus:outline-none transition-all shadow-sm"
                                wrapperClassName="w-full"
                            />
                        </div>

                        {showComplianceFilters && (
                            <>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                        Financial year (compliance)
                                    </label>
                                    <CustomSelect
                                        value={optionByValue(yearSelectOptions, complianceYear)}
                                        onChange={(opt) => {
                                            setComplianceYear(opt?.value || '');
                                            setCompliancePeriod('');
                                        }}
                                        options={yearSelectOptions}
                                        placeholder="All years"
                                        isClearable
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                        Period (compliance)
                                    </label>
                                    <CustomSelect
                                        value={optionByValue(periodSelectOptions, compliancePeriod)}
                                        onChange={(opt) => setCompliancePeriod(opt?.value || '')}
                                        options={periodSelectOptions}
                                        placeholder={
                                            !periodSourceService
                                                ? 'Select one compliance service'
                                                : !complianceYear
                                                    ? 'Select financial year first'
                                                    : periodOptions?.period_select_enabled
                                                        ? 'All periods in year'
                                                        : 'Annual (no period filter)'
                                        }
                                        isDisabled={!periodFilterEnabled}
                                        isClearable
                                    />
                                </div>
                            </>
                        )}

                        <div className="md:col-span-2 xl:col-span-2">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                Search
                            </label>
                            <div className="relative">
                                <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search service, firm, PAN, client, or mobile…"
                                    className="w-full rounded-xl border border-white/30 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 shadow-sm outline-none ring-indigo-300/30 focus:border-white focus:ring-2"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        aria-label="Clear search"
                                    >
                                        <FiX className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <div className="flex items-end md:col-span-2 xl:col-span-3">
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-sm font-semibold text-white/90 underline-offset-2 hover:text-white hover:underline"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Summary cards */}
            {summary && !loading && (
                <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:grid-cols-3 sm:px-6">
                    <SummaryCard
                        icon={FiLayers}
                        label="Services"
                        value={summary.total_services}
                        accent={{
                            border: 'border-indigo-100',
                            glow: 'bg-indigo-400',
                            text: 'text-indigo-700',
                            iconBg: 'bg-indigo-100',
                            iconText: 'text-indigo-600',
                        }}
                    />
                    <SummaryCard
                        icon={FiBriefcase}
                        label="Firms"
                        value={summary.total_firms}
                        accent={{
                            border: 'border-violet-100',
                            glow: 'bg-violet-400',
                            text: 'text-violet-700',
                            iconBg: 'bg-violet-100',
                            iconText: 'text-violet-600',
                        }}
                    />
                    <SummaryCard
                        icon={FiCheckCircle}
                        label="Tasks"
                        value={summary.total_tasks}
                        accent={{
                            border: 'border-emerald-100',
                            glow: 'bg-emerald-400',
                            text: 'text-emerald-700',
                            iconBg: 'bg-emerald-100',
                            iconText: 'text-emerald-600',
                        }}
                    />
                </div>
            )}

            {error && !loading && (
                <div className="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-6">
                    {error}
                </div>
            )}

            <div className="p-2 sm:p-4">
                {loading ? (
                    <ReportTableSkeleton rowCount={limit} />
                ) : rows.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100">
                            <FiBriefcase className="h-6 w-6 text-indigo-500" />
                        </div>
                        <p className="text-base font-semibold text-slate-800">No matching tasks found</p>
                        <p className="mt-1 text-sm text-slate-500">
                            Try adjusting filters for this CA
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed text-sm text-slate-700">
                                <thead>
                                    <tr className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/70">
                                        <th className="w-10 px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-indigo-900/70">#</th>
                                        <th className="w-[22%] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-indigo-900/70">Service</th>
                                        <th className="w-[24%] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-indigo-900/70">Firm</th>
                                        <th className="w-[20%] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-indigo-900/70">Client</th>
                                        <th className="w-[18%] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-indigo-900/70">Status</th>
                                        <th className="w-[16%] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-indigo-900/70">Completed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {rows.map((row, index) => {
                                        const typeLabel = String(row.service_type || 'general').toLowerCase();
                                        const isCompliance = typeLabel === 'compliance';
                                        const statusKey = String(row.status || '').toLowerCase();
                                        const clientMobile = formatMobile(row.client_country_code, row.client_mobile);
                                        const periodLabel = formatPeriodLabel(row);
                                        const typeBadge = isCompliance ? 'C' : 'G';
                                        const typeBadgeClass = isCompliance
                                            ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';

                                        const serviceContent = (
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                                    <span className="break-words font-semibold text-indigo-600 transition group-hover:text-indigo-800">
                                                        {row.service_name || '—'}
                                                    </span>
                                                    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${typeBadgeClass}`}>
                                                        {typeBadge}
                                                    </span>
                                                </div>
                                                {isCompliance && periodLabel ? (
                                                    <div className="mt-1 break-words text-[11px] font-medium text-slate-500">
                                                        {periodLabel}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );

                                        return (
                                            <tr
                                                key={row.task_id || index}
                                                className="transition-colors hover:bg-indigo-50/40"
                                            >
                                                <td className="px-3 py-3.5 align-top tabular-nums text-slate-400">
                                                    {rowOffset + index + 1}
                                                </td>
                                                <td className="px-4 py-3.5 align-top">
                                                    {row.task_id ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/task/profile/${encodeURIComponent(row.task_id)}/details`)}
                                                            className="group w-full min-w-0 text-left"
                                                        >
                                                            {serviceContent}
                                                        </button>
                                                    ) : (
                                                        serviceContent
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 align-top">
                                                    {row.firm_id ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openFirmModal(row)}
                                                            className="group w-full min-w-0 text-left"
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100 transition group-hover:bg-violet-100">
                                                                    <FiBriefcase className="h-3.5 w-3.5" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="break-words font-semibold leading-snug text-slate-900 transition group-hover:text-violet-700">
                                                                        {row.firm_name || '—'}
                                                                    </div>
                                                                    <div className="mt-0.5 break-all font-mono text-[11px] text-slate-500">
                                                                        {row.firm_pan ? `PAN: ${row.firm_pan}` : 'PAN: —'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 align-top">
                                                    {row.client_username ? (
                                                        <div className="min-w-0">
                                                            <Link
                                                                to={`/client/profile/${encodeURIComponent(row.client_username)}`}
                                                                className="block break-words font-semibold leading-snug text-slate-900 no-underline transition hover:text-indigo-700"
                                                            >
                                                                {row.client_name || row.client_username}
                                                            </Link>
                                                            {clientMobile ? (
                                                                <div className="mt-1 flex flex-wrap items-center gap-1 break-all text-[11px] text-slate-500">
                                                                    <FiPhone className="h-3 w-3 shrink-0" />
                                                                    <span>{clientMobile}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-1 text-[11px] text-slate-400">No mobile</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 align-top">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[statusKey] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                                                        }`}>
                                                        {getStatusLabel(statusKey)}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3.5 align-top text-slate-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <FiCalendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                        {formatDate(row.complete_date)}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <TablePagination
                            page={pagination.page}
                            limit={pagination.limit}
                            total={pagination.total}
                            totalPages={pagination.total_pages}
                            isLastPage={pagination.is_last_page}
                            rowOptions={[10, 20, 50, 100]}
                            defaultRows={20}
                            onPageChange={setPage}
                            onLimitChange={(nextLimit) => {
                                setLimit(nextLimit);
                                setPage(1);
                            }}
                        />
                    </div>
                )}
            </div>

            <FirmsDetailsModal
                isOpen={firmModal.open}
                onClose={() => setFirmModal({ open: false, firm: null, clientName: '' })}
                firms={firmModal.firm ? [firmModal.firm] : []}
                clientName={firmModal.clientName}
            />
        </div>
    );
}
