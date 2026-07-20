import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiCalendar,
  FiLoader,
  FiMail,
  FiPhone,
  FiRefreshCw,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Header, Sidebar } from "../components/header";
import TablePagination from "../components/TablePagination";
import AssignedStaffList from "../components/Modals/AssignedStaffList";
import CustomSelect from "../components/CustomSelect";
import StartWorkingModal from "../components/Modals/StartWorkingModal";
import useDebounce from "../components/useDebounce";
import { formatMoney } from "./office-assistance/complianceShared";
import {
  changeComplianceTaskStatus,
  extractApiError,
  fetchComplianceServices,
  fetchComplianceYetNotStarted,
  getPreviousCompliancePeriod,
  getCurrentComplianceYear,
  normalizeAssignees,
  normalizeFrequency,
} from "../services/complianceService";

const TABLE_HEAD_ROW =
  "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200";
const TABLE_TH =
  "p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-l border-gray-100";
const TABLE_TH_FIRST =
  "p-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide";
const TABLE_ROW_BASE =
  "border-b border-gray-100 transition-colors group bg-white hover:bg-gray-50";
const TABLE_TD = "p-3 min-w-0 text-left align-middle border-l border-gray-100";
const TABLE_TD_FIRST = "p-3 min-w-0 text-left align-middle";
const COLUMN_STACK =
  "flex flex-col items-start justify-start gap-2 w-full min-w-0";
const SUB_CELL = "w-full";
const SUB_CELL_DIVIDER = "border-b border-gray-100 my-1";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_TITLE = "text-sm font-semibold text-gray-800";
const CELL_INDEX = "text-[11px] font-bold text-gray-800";
const FEES_CHIP =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200";
const CellDash = () => <span className="text-sm text-gray-400">—</span>;
const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gray-50";
const TOOLBAR_INPUT =
  "w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none";

const StackedColumnCell = ({ items }) => {
  if (!items?.length) return <CellDash />;
  return (
    <div className={COLUMN_STACK}>
      {items.map((content, idx) => (
        <div key={idx} className={SUB_CELL}>
          {content}
          {idx < items.length - 1 ? <div className={SUB_CELL_DIVIDER} /> : null}
        </div>
      ))}
    </div>
  );
};

const StackedSkeletonCell = ({ rows = 3 }) => (
  <div className={COLUMN_STACK}>
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className={SUB_CELL}>
        <div className="h-3.5 bg-gray-200 rounded max-w-[120px]" />
        {idx < rows - 1 ? <div className={SUB_CELL_DIVIDER} /> : null}
      </div>
    ))}
  </div>
);

const getDaysLeft = (dueDate) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const formatDueDaysLabel = (dueDate) => {
  if (!dueDate) return null;
  const daysLeft = getDaysLeft(dueDate);
  if (daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft < 0) return `OD by ${Math.abs(daysLeft)}D`;
  if (daysLeft === 0) return "Due today";
  return `Due in ${daysLeft}D`;
};

const isDueOverdue = (dueDate) => {
  const daysLeft = getDaysLeft(dueDate);
  return daysLeft !== null && daysLeft < 0;
};

const getDueDaysColorClass = (dueDate) => {
  const daysLeft = getDaysLeft(dueDate);
  if (daysLeft === null || daysLeft === undefined) return "text-gray-400";
  if (daysLeft < 0) return "text-red-600 font-semibold";
  if (daysLeft <= 7) return "text-orange-600";
  return "text-green-600";
};

const getDueDateColorClass = (dueDate) =>
  isDueOverdue(dueDate) ? "text-red-600" : "text-gray-700";

const formatFeesWithGst = (charges) => {
  if (charges?.fees == null) return null;
  const fees = Number(charges.fees) || 0;
  const taxValue = Number(charges.tax_value) || 0;
  return formatMoney(fees + taxValue);
};

const formatDueDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getServiceLabel = (service) =>
  service?.service_name || service?.name || service?.service_id || "";

const rowDates = (row) => {
  const dates = row?.dates || {};
  return {
    ...dates,
    compliance_year: row?.compliance_year ?? dates.compliance_year,
    compliance_period: row?.compliance_period ?? dates.compliance_period,
    due_date: dates.due_date ?? row?.due_date,
  };
};

const rowFirm = (row) => row?.firm || {};
const rowService = (row) => row?.service || {};
const rowCharges = (row) => row?.charges || {};
const rowClientContact = (row) => {
  const client = row?.client || {};
  const profile = client.profile || {};
  return {
    username: client.username || "",
    name: profile.name || client.name || "",
    mobile: profile.mobile || client.mobile || "",
    email: profile.email || client.email || "",
  };
};

const resolveCompliancePeriod = (row) => {
  const dates = rowDates(row);
  const candidates = [
    dates.compliance_period,
    row?.compliance_period,
    row?.period,
  ];
  for (const value of candidates) {
    if (value != null && String(value).trim() !== "")
      return String(value).trim();
  }
  return null;
};

const getPeriodLabel = (row, periodOptions) => {
  const raw = resolveCompliancePeriod(row);
  if (raw) {
    const periods = periodOptions?.periods ?? [];
    const match = periods.find(
      (item) => String(item.value) === raw || String(item.label) === raw,
    );
    return match?.label || match?.value || raw;
  }
  const frequency =
    periodOptions?.frequency ?? rowService(row)?.frequency ?? row?.frequency;
  if (frequency === "yearly") return "Yearly";
  return null;
};

const getFirmFileNo = (firm) => firm?.file_no || firm?.file_number || "";
const getFirmType = (firm) => firm?.firm_type || "";

const taskRowKey = (row) => {
  const dates = rowDates(row);
  const firm = rowFirm(row);
  const service = rowService(row);
  return `${service.service_id || ""}:${firm.firm_id || ""}:${dates.compliance_year || ""}:${dates.compliance_period ?? ""}`;
};

const toStaffUser = (entry) => {
  if (!entry) return null;
  if (typeof entry === "object") {
    return {
      username: entry.username || entry.name || "",
      name: entry.name || entry.username || "Staff",
      email: entry.email || "",
      mobile: entry.mobile || "",
    };
  }
  if (typeof entry === "string" && entry.trim()) {
    return { username: entry, name: entry, email: "", mobile: "" };
  }
  return null;
};

const resolveStaffList = (staffs) => {
  const raw = Array.isArray(staffs) ? staffs : normalizeAssignees(staffs);
  return raw.map(toStaffUser).filter(Boolean);
};

const StaffAvatarsCell = ({ row, onOpenStaffModal }) => {
  const staffs = resolveStaffList(row.staffs);
  const serviceLabel = rowService(row).name || rowService(row).service_id || "";
  if (staffs.length === 0) return <CellDash />;

  const visible = staffs.slice(0, 2);
  const showMoreCount = staffs.length - visible.length;

  return (
    <div className="flex -space-x-2">
      {visible.map((staff, staffIndex) => {
        const staffName = staff.name || "S";
        return (
          <button
            type="button"
            key={staff.username || staffIndex}
            onClick={() => onOpenStaffModal(staffs, serviceLabel)}
            className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
            title={staffName}
          >
            {staffName.charAt(0).toUpperCase()}
          </button>
        );
      })}
      {showMoreCount > 0 ? (
        <button
          type="button"
          onClick={() => onOpenStaffModal(staffs, serviceLabel)}
          className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-700 hover:opacity-80"
        >
          +{showMoreCount}
        </button>
      ) : null}
    </div>
  );
};

const StaffRolesCell = ({ row }) => {
  const caName = row.has_ca && row.ca ? row.ca.name || row.ca.username : null;
  const agentName =
    row.has_agent && row.agent ? row.agent.name || row.agent.username : null;
  if (!caName && !agentName) return <CellDash />;
  return (
    <div className="flex flex-col items-start gap-1 w-full min-w-0">
      {caName ? (
        <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded truncate max-w-full">
          CA: {caName}
        </span>
      ) : null}
      {agentName ? (
        <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded truncate max-w-full">
          Agent: {agentName}
        </span>
      ) : null}
    </div>
  );
};

const ComplianceYetNotStarted = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialServiceId = searchParams.get("service_id") || "";
  const initialYear =
    searchParams.get("compliance_year") || getCurrentComplianceYear();
  const initialPeriod = searchParams.get("compliance_period") || "";
  const initialSearch = searchParams.get("search") || "";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [complianceYear, setComplianceYear] = useState(initialYear);
  const [compliancePeriod, setCompliancePeriod] = useState(initialPeriod);
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 400);
  const [periodOptions, setPeriodOptions] = useState(null);
  // Wait for default period when landing with service_id but no period in URL
  const [filtersReady, setFiltersReady] = useState(
    () => !initialServiceId || Boolean(initialPeriod),
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPending, setTotalPending] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  const [startWorkingTarget, setStartWorkingTarget] = useState(null);
  const [startWorkingLoading, setStartWorkingLoading] = useState(false);
  const [statusUpdatingKey, setStatusUpdatingKey] = useState(null);
  const [staffModal, setStaffModal] = useState({
    open: false,
    users: [],
    taskName: "",
  });

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  const yearOptions = useMemo(() => {
    const currentStart = Number(getCurrentComplianceYear().split("-")[0]);
    return Array.from({ length: 5 }, (_, index) => {
      const start = currentStart - 2 + index;
      return `${start}-${start + 1}`;
    });
  }, []);

  const branchServices = useMemo(
    () =>
      services.filter(
        (item) =>
          item.is_added === true ||
          item.is_added === "1" ||
          item.is_added == null,
      ),
    [services],
  );

  const resolveDefaultPeriodForService = useCallback((service) => {
    if (!service) return { period: "", year: null };
    const frequency = normalizeFrequency(service.frequency);
    if (frequency === "yearly") return { period: "", year: null };
    const previous = getPreviousCompliancePeriod(service.frequency);
    return {
      period: previous.period || "",
      year: previous.year || null,
    };
  }, []);

  const yearSelectOptions = useMemo(
    () => yearOptions.map((year) => ({ value: year, label: year })),
    [yearOptions],
  );

  const serviceSelectOptions = useMemo(
    () =>
      branchServices.map((service) => ({
        value: String(service.service_id),
        label: getServiceLabel(service),
      })),
    [branchServices],
  );

  const periodSelectEnabled = Boolean(periodOptions?.period_select_enabled);
  const periodChoices = periodOptions?.periods || [];

  const periodSelectOptions = useMemo(
    () =>
      periodChoices.map((period) => ({
        value: String(period.value),
        label: period.label || period.value,
      })),
    [periodChoices],
  );

  const selectedServiceOption = useMemo(
    () =>
      serviceSelectOptions.find(
        (option) => option.value === String(serviceId),
      ) || null,
    [serviceSelectOptions, serviceId],
  );

  const selectedYearOption = useMemo(
    () =>
      yearSelectOptions.find((option) => option.value === complianceYear) ||
      null,
    [yearSelectOptions, complianceYear],
  );

  const selectedPeriodOption = useMemo(
    () =>
      periodSelectOptions.find((option) => option.value === compliancePeriod) ||
      null,
    [periodSelectOptions, compliancePeriod],
  );

  const syncUrl = useCallback(
    (overrides = {}) => {
      const nextServiceId = overrides.service_id ?? serviceId;
      const nextYear = overrides.compliance_year ?? complianceYear;
      const nextPeriod = overrides.compliance_period ?? compliancePeriod;
      const nextSearch = overrides.search ?? debouncedSearch;
      const params = new URLSearchParams();
      if (nextServiceId) params.set("service_id", nextServiceId);
      if (nextYear) params.set("compliance_year", nextYear);
      if (nextServiceId && nextYear && nextPeriod) {
        params.set("compliance_period", nextPeriod);
      }
      if (String(nextSearch || "").trim()) {
        params.set("search", String(nextSearch).trim());
      }
      // replace: true so filter sync does not trap browser Back
      setSearchParams(params, { replace: true });
    },
    [
      serviceId,
      complianceYear,
      compliancePeriod,
      debouncedSearch,
      setSearchParams,
    ],
  );

  const loadServices = useCallback(async () => {
    try {
      const res = await fetchComplianceServices({ page_no: 1, limit: 100 });
      setServices(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load compliance services"));
      setServices([]);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplianceYetNotStarted({
        service_id: serviceId,
        compliance_year: complianceYear,
        compliance_period:
          serviceId && complianceYear && compliancePeriod
            ? compliancePeriod
            : "",
        search: debouncedSearch,
        page_no: pagination.page,
        limit: pagination.limit,
      });

      setRows(Array.isArray(res?.data) ? res.data : []);
      setPeriodOptions(res?.query_payload?.period_options || null);

      const pageInfo = res?.pagination || {};
      const total = Number(res?.total ?? pageInfo.total) || 0;
      setTotalPending(total);
      setPagination((prev) => ({
        ...prev,
        page: pageInfo.page_no || pageInfo.page || prev.page,
        limit: pageInfo.limit || prev.limit,
        total,
        total_pages: pageInfo.total_pages ?? 1,
        has_more: pageInfo.has_more ?? pageInfo.is_last_page === false,
      }));
    } catch (error) {
      toast.error(
        extractApiError(error, "Failed to load yet not started compliance"),
      );
      setRows([]);
      setTotalPending(0);
    } finally {
      setLoading(false);
    }
  }, [
    serviceId,
    complianceYear,
    compliancePeriod,
    debouncedSearch,
    pagination.page,
    pagination.limit,
  ]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Resolve current period from service frequency before first list fetch
  useEffect(() => {
    if (filtersReady) return;
    if (!serviceId) {
      setFiltersReady(true);
      return;
    }
    if (!services.length) return;

    const service = services.find(
      (item) => String(item.service_id) === String(serviceId),
    );
    if (!service) {
      setFiltersReady(true);
      return;
    }

    const defaults = resolveDefaultPeriodForService(service);
    if (defaults.period && defaults.period !== compliancePeriod) {
      setCompliancePeriod(defaults.period);
    }
    if (defaults.year && defaults.year !== complianceYear) {
      setComplianceYear(defaults.year);
    }
    setFiltersReady(true);
  }, [
    filtersReady,
    serviceId,
    services,
    compliancePeriod,
    complianceYear,
    resolveDefaultPeriodForService,
  ]);

  useEffect(() => {
    if (!filtersReady) return;
    loadRows();
  }, [loadRows, filtersReady]);

  useEffect(() => {
    if (!filtersReady) return;
    syncUrl({ search: debouncedSearch });
  }, [
    filtersReady,
    serviceId,
    complianceYear,
    compliancePeriod,
    debouncedSearch,
    syncUrl,
  ]);

  useEffect(() => {
    if (!filtersReady) return;
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [
    serviceId,
    complianceYear,
    compliancePeriod,
    debouncedSearch,
    filtersReady,
  ]);

  const handleServiceChange = (option) => {
    const next = option?.value ? String(option.value) : "";
    setServiceId(next);
    setPeriodOptions(null);
    if (!next) {
      setCompliancePeriod("");
    } else {
      const service = branchServices.find(
        (item) => String(item.service_id) === next,
      );
      const defaults = resolveDefaultPeriodForService(service);
      setCompliancePeriod(defaults.period);
      if (defaults.year) {
        setComplianceYear(defaults.year);
      }
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleConfirmStart = async () => {
    if (!startWorkingTarget) return;
    const row = startWorkingTarget;
    const dates = rowDates(row);
    const firm = rowFirm(row);
    const service = rowService(row);
    const rowKey = taskRowKey(row);

    setStartWorkingLoading(true);
    setStatusUpdatingKey(rowKey);
    try {
      const payload = {
        service_id: service.service_id,
        firm_id: firm.firm_id,
        status: "in process",
        compliance_year: dates.compliance_year,
      };
      if (dates.compliance_period) {
        payload.compliance_period = dates.compliance_period;
      }

      const res = await changeComplianceTaskStatus(payload);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to start task");
      }
      toast.success(res.message || "Task started");
      setStartWorkingTarget(null);
      await loadRows();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to start task"));
    } finally {
      setStartWorkingLoading(false);
      setStatusUpdatingKey(null);
    }
  };

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

      <div
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-3 md:px-4 py-4 border-b border-gray-100">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 m-0">
                    Yet Not Started
                  </h1>
                  <p className="text-sm text-slate-500 mt-1 mb-0">
                    Compliance periods that are visible but not started as
                    tasks.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 w-fit">
                  {totalPending} pending
                </span>
              </div>
            </div>

            <div className={`${TOOLBAR_ROW} flex-wrap`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 flex-1 min-w-0 w-full items-end">
                <CustomSelect
                  label="Service"
                  options={serviceSelectOptions}
                  value={selectedServiceOption}
                  onChange={handleServiceChange}
                  placeholder="All services"
                  isClearable
                />

                <CustomSelect
                  label="Compliance year"
                  options={yearSelectOptions}
                  value={selectedYearOption}
                  onChange={(option) => {
                    if (!option?.value) return;
                    setComplianceYear(String(option.value));
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Select year"
                  isSearchable={false}
                  isClearable={false}
                />

                <CustomSelect
                  label="Period"
                  options={periodSelectOptions}
                  value={selectedPeriodOption}
                  onChange={(option) => {
                    const next = option?.value ? String(option.value) : "";
                    setCompliancePeriod(next);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  placeholder={
                    !serviceId
                      ? "Select a service first"
                      : !periodSelectEnabled
                        ? "All periods in year (yearly service)"
                        : "All periods in year"
                  }
                  isDisabled={!periodSelectEnabled}
                  isClearable
                />

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Firm, client, service..."
                    className={TOOLBAR_INPUT}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadRows}
                    disabled={loading}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    title="Refresh"
                  >
                    <FiRefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={TABLE_TH_FIRST}>#</th>
                    <th className={TABLE_TH}>Service</th>
                    <th className={TABLE_TH}>Due</th>
                    <th className={TABLE_TH}>Client</th>
                    <th className={TABLE_TH}>Firm</th>
                    <th className={TABLE_TH}>Staff</th>
                    <th className={TABLE_TH}>Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading || !filtersReady ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className={TABLE_TD_FIRST}>
                          <div
                            className={`${CELL_INDEX} h-3.5 bg-gray-200 rounded w-6`}
                          />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedSkeletonCell rows={3} />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedSkeletonCell rows={2} />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedSkeletonCell rows={3} />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedSkeletonCell rows={3} />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedSkeletonCell rows={2} />
                        </td>
                        <td className={TABLE_TD}>
                          <StackedSkeletonCell rows={1} />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className={`${TABLE_TD} py-12 text-center`}
                      >
                        <p className="text-sm font-medium text-gray-500 m-0">
                          No 'yet not started' compliance items
                        </p>
                        <p className="text-xs text-gray-400 mt-1 m-0">
                          Try adjusting the filters above.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => {
                      const rowKey = taskRowKey(row);
                      const dates = rowDates(row);
                      const firm = rowFirm(row);
                      const service = rowService(row);
                      const client = rowClientContact(row);
                      const charges = rowCharges(row);
                      const serialNo =
                        (pagination.page - 1) * pagination.limit + idx + 1;
                      const periodLabel = getPeriodLabel(row, periodOptions);
                      const feesLabel = formatFeesWithGst(charges);
                      const dueDaysLabel = formatDueDaysLabel(dates.due_date);
                      const fileNo = getFirmFileNo(firm);
                      const firmType = getFirmType(firm);
                      const serviceName =
                        service.name || service.service_id || "—";
                      const overdue = isDueOverdue(dates.due_date);
                      const isUpdating = statusUpdatingKey === rowKey;

                      return (
                        <tr key={rowKey} className={TABLE_ROW_BASE}>
                          <td className={`${TABLE_TD_FIRST} ${CELL_INDEX}`}>
                            {serialNo}
                          </td>
                          <td className={TABLE_TD}>
                            <StackedColumnCell
                              items={[
                                <span
                                  className={`${CELL_TITLE} truncate max-w-full block`}
                                >
                                  {serviceName}
                                </span>,
                                periodLabel ? (
                                  <span className={`${CELL_BODY} block`}>
                                    {periodLabel}
                                  </span>
                                ) : (
                                  <CellDash />
                                ),
                                feesLabel ? (
                                  <span className={FEES_CHIP}>{feesLabel}</span>
                                ) : (
                                  <CellDash />
                                ),
                              ]}
                            />
                          </td>
                          <td className={TABLE_TD}>
                            <StackedColumnCell
                              items={[
                                <div
                                  className={`flex items-center gap-1.5 font-medium text-sm ${getDueDateColorClass(dates.due_date)}`}
                                >
                                  <FiCalendar
                                    className={`w-3.5 h-3.5 flex-shrink-0 ${overdue ? "text-red-500" : "text-gray-400"}`}
                                  />
                                  <span>{formatDueDate(dates.due_date)}</span>
                                </div>,
                                dueDaysLabel ? (
                                  <span
                                    className={`text-sm ${getDueDaysColorClass(dates.due_date)}`}
                                  >
                                    {dueDaysLabel}
                                  </span>
                                ) : (
                                  <CellDash />
                                ),
                              ]}
                            />
                          </td>
                          <td className={TABLE_TD}>
                            <StackedColumnCell
                              items={[
                                client.username ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/client/profile/${client.username}`,
                                      )
                                    }
                                    className={`${CELL_TITLE} truncate max-w-full block text-left hover:text-indigo-600 transition-colors`}
                                  >
                                    {client.name || "—"}
                                  </button>
                                ) : (
                                  <span
                                    className={`${CELL_TITLE} truncate max-w-full block`}
                                  >
                                    {client.name || "—"}
                                  </span>
                                ),
                                <div className="flex items-center gap-2 text-gray-700 font-medium text-sm min-w-0">
                                  <FiPhone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {client.mobile || "—"}
                                  </span>
                                </div>,
                                <div className="flex items-center gap-2 text-gray-700 font-medium text-sm min-w-0">
                                  <FiMail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <span
                                    className="truncate"
                                    title={client.email || ""}
                                  >
                                    {client.email || "—"}
                                  </span>
                                </div>,
                              ]}
                            />
                          </td>
                          <td className={TABLE_TD}>
                            <StackedColumnCell
                              items={[
                                <span
                                  className={`${CELL_BODY} truncate max-w-full block`}
                                >
                                  {firm.firm_name || firm.firm_id || "—"}
                                </span>,
                                firmType ? (
                                  <span
                                    className={`${CELL_BODY} block capitalize`}
                                  >
                                    {firmType}
                                  </span>
                                ) : (
                                  <CellDash />
                                ),
                                <span className={`${CELL_BODY} block`}>
                                  {fileNo || "—"}
                                </span>,
                              ]}
                            />
                          </td>
                          <td className={TABLE_TD}>
                            <StackedColumnCell
                              items={[
                                <StaffAvatarsCell
                                  row={row}
                                  onOpenStaffModal={(users, taskName) =>
                                    setStaffModal({
                                      open: true,
                                      users,
                                      taskName,
                                    })
                                  }
                                />,
                                <StaffRolesCell row={row} />,
                              ]}
                            />
                          </td>
                          <td className={TABLE_TD}>
                            <button
                              type="button"
                              onClick={() => setStartWorkingTarget(row)}
                              disabled={isUpdating || startWorkingLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isUpdating ? (
                                <FiLoader className="w-3.5 h-3.5 animate-spin" />
                              ) : null}
                              Start
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && pagination.total_pages > 1 ? (
              <TablePagination
                page={pagination.page}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={pagination.total_pages}
                onPageChange={(page) =>
                  setPagination((prev) => ({ ...prev, page }))
                }
                onLimitChange={(limit) =>
                  setPagination((prev) => ({ ...prev, page: 1, limit }))
                }
              />
            ) : null}
          </div>
        </div>
      </div>

      <StartWorkingModal
        row={startWorkingTarget}
        loading={startWorkingLoading}
        periodOptions={periodOptions}
        onConfirm={handleConfirmStart}
        onCancel={() => {
          if (!startWorkingLoading) setStartWorkingTarget(null);
        }}
      />

      <AssignedStaffList
        isOpen={staffModal.open}
        onClose={() => setStaffModal({ open: false, users: [], taskName: "" })}
        users={staffModal.users}
        taskName={staffModal.taskName}
      />
    </div>
  );
};

export default ComplianceYetNotStarted;
