import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiEdit2,
  FiHome,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../../components/header';
import TablePagination from '../../components/TablePagination';
import {
  addComplianceFirm,
  buildEffectiveFrom,
  changeComplianceTaskStatus,
  COMPLIANCE_MONTHS,
  COMPLIANCE_TASK_STATUSES,
  deleteComplianceFirm,
  editComplianceFirm,
  extractApiError,
  fetchAgentOptions,
  fetchCaOptions,
  fetchComplianceFirms,
  fetchComplianceServices,
  fetchComplianceTaskList,
  fetchFirmOptions,
  fetchStaffOptions,
  getCurrentComplianceYear,
  getDefaultEffectiveFromFields,
  getPeriodOptions,
  HALF_YEARLY_PERIODS,
  normalizeAssignees,
  normalizeFrequency,
  QUARTERLY_PERIODS,
} from '../../services/complianceService';

const GST_RATE_OPTIONS = [0, 5, 12, 18, 28];

const formatMoney = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const StatusBadge = ({ status }) => {
  if (!status) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Not started
      </span>
    );
  }

  const styles = {
    'in process': 'bg-blue-100 text-blue-700',
    'pending from client': 'bg-amber-100 text-amber-700',
    'pending from department': 'bg-orange-100 text-orange-700',
    complete: 'bg-green-100 text-green-700',
    cancel: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        styles[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
};

const MultiSelectField = ({ label, options, value, onChange, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      multiple
      value={value}
      onChange={(event) => {
        const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
        onChange(selected);
      }}
      disabled={disabled}
      className="w-full min-h-[110px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <p className="text-xs text-gray-500 mt-1 m-0">Hold Cmd/Ctrl to select multiple usernames.</p>
  </div>
);

const EffectiveFromField = ({ frequency, value, onChange, disabled, yearOptions }) => {
  const normalized = normalizeFrequency(frequency);

  if (normalized === 'yearly') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Effective from (FY) <span className="text-red-500">*</span>
        </label>
        <select
          value={`${value.fyStart}-${value.fyEnd}`}
          onChange={(e) => {
            const [fyStart, fyEnd] = e.target.value.split('-').map(Number);
            onChange({ ...value, fyStart, fyEnd });
          }}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1 m-0">
          First financial year from which this firm is assigned.
        </p>
      </div>
    );
  }

  if (normalized === 'quarterly') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Effective from quarter <span className="text-red-500">*</span>
          </label>
          <select
            value={value.period}
            onChange={(e) => onChange({ ...value, period: e.target.value })}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
          >
            {QUARTERLY_PERIODS.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            FY start year <span className="text-red-500">*</span>
          </label>
          <select
            value={value.fyStartYear}
            onChange={(e) => onChange({ ...value, fyStartYear: Number(e.target.value) })}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
          >
            {yearOptions.map((year) => {
              const fyStart = Number(year.split('-')[0]);
              return (
                <option key={year} value={fyStart}>
                  {fyStart} (FY {year})
                </option>
              );
            })}
          </select>
        </div>
        <p className="text-xs text-gray-500 m-0 sm:col-span-2">
          Example: Q2 (Jul-Sep)-2026 — tasks before this quarter are blocked.
        </p>
      </div>
    );
  }

  if (normalized === 'half-yearly') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Effective from half <span className="text-red-500">*</span>
          </label>
          <select
            value={value.period}
            onChange={(e) => onChange({ ...value, period: e.target.value })}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
          >
            {HALF_YEARLY_PERIODS.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            FY start year <span className="text-red-500">*</span>
          </label>
          <select
            value={value.fyStartYear}
            onChange={(e) => onChange({ ...value, fyStartYear: Number(e.target.value) })}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
          >
            {yearOptions.map((year) => {
              const fyStart = Number(year.split('-')[0]);
              return (
                <option key={year} value={fyStart}>
                  {fyStart} (FY {year})
                </option>
              );
            })}
          </select>
        </div>
        <p className="text-xs text-gray-500 m-0 sm:col-span-2">
          Example: H1 (Apr-Sep)-2026 — tasks before this half are blocked.
        </p>
      </div>
    );
  }

  const calendarYears = yearOptions.flatMap((year) => {
    const [start, end] = year.split('-').map(Number);
    return [start, end];
  });
  const uniqueYears = [...new Set(calendarYears)];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Effective from month <span className="text-red-500">*</span>
        </label>
        <select
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
        >
          {COMPLIANCE_MONTHS.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Year <span className="text-red-500">*</span>
        </label>
        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
        >
          {uniqueYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-500 m-0 sm:col-span-2">
        Example: May-2026 — April 2026 tasks are blocked; May 2026 onward are allowed.
      </p>
    </div>
  );
};

const FirmFormModal = ({ isOpen, mode, initialFirm, services, saving, onClose, onSubmit, yearOptions }) => {
  const [form, setForm] = useState({
    service_id: '',
    firm_id: '',
    fees: '',
    tax_rate: '18',
    due_date: '10',
    staffs: [],
    ca: [],
    agent: [],
  });
  const [firmOptions, setFirmOptions] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [caOptions, setCaOptions] = useState([]);
  const [agentOptions, setAgentOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [effectiveFromFields, setEffectiveFromFields] = useState(() =>
    getDefaultEffectiveFromFields('monthly'),
  );

  const selectedFormService = useMemo(
    () => services.find((item) => item.service_id === form.service_id) || null,
    [services, form.service_id],
  );

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initialFirm) {
      setForm({
        service_id: initialFirm.service_id || '',
        firm_id: initialFirm.firm_id || '',
        fees: String(initialFirm.fees ?? ''),
        tax_rate: String(initialFirm.tax_rate ?? '18'),
        due_date: String(initialFirm.due_date ?? '10'),
        staffs: normalizeAssignees(initialFirm.staffs),
        ca: normalizeAssignees(initialFirm.ca),
        agent: normalizeAssignees(initialFirm.agent),
      });
    } else {
      const defaultService = services[0];
      setForm({
        service_id: defaultService?.service_id || '',
        firm_id: '',
        fees: '',
        tax_rate: '18',
        due_date: '10',
        staffs: [],
        ca: [],
        agent: [],
      });
      setEffectiveFromFields(getDefaultEffectiveFromFields(defaultService?.frequency));
    }
  }, [isOpen, mode, initialFirm, services]);

  useEffect(() => {
    if (!isOpen || mode !== 'add' || !selectedFormService) return;
    setEffectiveFromFields(getDefaultEffectiveFromFields(selectedFormService.frequency));
  }, [isOpen, mode, selectedFormService?.service_id, selectedFormService?.frequency]);

  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const [firmsRes, staffRes, caRes, agentRes] = await Promise.all([
          fetchFirmOptions({ page_no: 1, limit: 100 }),
          fetchStaffOptions({ page: 1, limit: 100 }),
          fetchCaOptions({ page: 1, limit: 100 }),
          fetchAgentOptions({ page: 1, limit: 100 }),
        ]);

        setFirmOptions(
          (firmsRes?.data || []).map((item) => ({
            value: item.firm_id,
            label: `${item.firm_name || item.firm_id} (${item.firm_id})`,
          })),
        );
        setStaffOptions(
          (staffRes?.data || []).map((item) => ({
            value: item.username,
            label: item.name ? `${item.name} (${item.username})` : item.username,
          })),
        );
        setCaOptions(
          (caRes?.data || []).map((item) => ({
            value: item.username,
            label: item.name ? `${item.name} (${item.username})` : item.username,
          })),
        );
        setAgentOptions(
          (agentRes?.data || []).map((item) => ({
            value: item.username,
            label: item.name ? `${item.name} (${item.username})` : item.username,
          })),
        );
      } catch (error) {
        toast.error(extractApiError(error, 'Failed to load form options'));
      } finally {
        setOptionsLoading(false);
      }
    };

    loadOptions();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const fees = Number(form.fees);
    const tax_rate = Number(form.tax_rate);
    const due_date = Number(form.due_date);

    if (mode === 'add') {
      if (!form.service_id || !form.firm_id) {
        toast.error('Service and firm are required');
        return;
      }
    }

    if (!Number.isFinite(fees) || fees < 0) {
      toast.error('Enter a valid fees amount');
      return;
    }
    if (!Number.isFinite(tax_rate) || tax_rate < 0) {
      toast.error('Enter a valid tax rate');
      return;
    }
    if (!Number.isInteger(due_date) || due_date < 1 || due_date > 31) {
      toast.error('Due date must be between 1 and 31');
      return;
    }

    let effective_from;
    if (mode === 'add') {
      if (!selectedFormService) {
        toast.error('Select a compliance service');
        return;
      }
      effective_from = buildEffectiveFrom(selectedFormService.frequency, effectiveFromFields);
      if (!effective_from) {
        toast.error('Effective from is required');
        return;
      }
    }

    onSubmit({
      ...form,
      fees,
      tax_rate,
      due_date,
      ...(mode === 'add' ? { effective_from } : {}),
    });
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-800 m-0">
            {mode === 'add' ? 'Add compliance firm' : 'Edit compliance firm'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto min-h-0">
          {optionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
              <FiLoader className="w-4 h-4 animate-spin" />
              Loading options...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.service_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, service_id: e.target.value }))}
                    disabled={saving || mode === 'edit'}
                    className={inputClass}
                  >
                    <option value="">Select service</option>
                    {services.map((service) => (
                      <option key={service.service_id} value={service.service_id}>
                        {service.service_name || service.service_id}
                      </option>
                    ))}
                  </select>
                </div>

                {mode === 'add' && selectedFormService ? (
                  <EffectiveFromField
                    frequency={selectedFormService.frequency}
                    value={effectiveFromFields}
                    onChange={setEffectiveFromFields}
                    disabled={saving}
                    yearOptions={yearOptions}
                  />
                ) : null}

                {mode === 'edit' && initialFirm?.effective_from ? (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective from
                    </label>
                    <p className="text-sm text-gray-800 m-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      {initialFirm.effective_from}
                    </p>
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firm <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.firm_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, firm_id: e.target.value }))}
                    disabled={saving || mode === 'edit'}
                    className={inputClass}
                  >
                    <option value="">Select firm</option>
                    {firmOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fees <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.fees}
                    onChange={(e) => setForm((prev) => ({ ...prev, fees: e.target.value }))}
                    disabled={saving}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax rate (%) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.tax_rate}
                    onChange={(e) => setForm((prev) => ({ ...prev, tax_rate: e.target.value }))}
                    disabled={saving}
                    className={inputClass}
                  >
                    {GST_RATE_OPTIONS.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due day of month <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.due_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                    disabled={saving}
                    className={inputClass}
                  />
                </div>
              </div>

              <MultiSelectField
                label="Staff"
                options={staffOptions}
                value={form.staffs}
                onChange={(staffs) => setForm((prev) => ({ ...prev, staffs }))}
                disabled={saving}
              />
              <MultiSelectField
                label="CA"
                options={caOptions}
                value={form.ca}
                onChange={(ca) => setForm((prev) => ({ ...prev, ca }))}
                disabled={saving}
              />
              <MultiSelectField
                label="Agent"
                options={agentOptions}
                value={form.agent}
                onChange={(agent) => setForm((prev) => ({ ...prev, agent }))}
                disabled={saving}
              />
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || optionsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
              {mode === 'add' ? 'Add firm' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const taskRowToFirm = (row) => ({
  id: row.compliance_firm_id,
  service_id: row.service_id,
  service_name: row.service_name,
  firm_id: row.firm_id,
  firm_name: row.firm_name,
  fees: row.fees,
  tax_rate: row.tax_rate,
  due_date: row.due_day,
  effective_from: row.effective_from,
  staffs: row.staffs,
  ca: row.ca,
  agent: row.agent,
});

const taskRowKey = (row) =>
  `${row.firm_id}:${row.compliance_year}:${row.compliance_period}`;

const ComplianceServices = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'),
  );

  const [activeView, setActiveView] = useState('tasks');

  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [complianceYear, setComplianceYear] = useState(getCurrentComplianceYear());
  const [compliancePeriod, setCompliancePeriod] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });

  const [statusUpdatingKey, setStatusUpdatingKey] = useState(null);

  const [firmModal, setFirmModal] = useState(null);
  const [firmSaving, setFirmSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const selectedService = useMemo(
    () => services.find((item) => item.service_id === serviceId) || null,
    [services, serviceId],
  );

  const periodOptions = useMemo(
    () => getPeriodOptions(selectedService?.frequency),
    [selectedService],
  );

  const branchServices = useMemo(
    () => services.filter((item) => item.is_added === 1 || item.is_added === true || item.is_added === '1'),
    [services],
  );

  const yearOptions = useMemo(() => {
    const currentStart = Number(getCurrentComplianceYear().split('-')[0]);
    return Array.from({ length: 5 }, (_, index) => {
      const start = currentStart - 2 + index;
      return `${start}-${start + 1}`;
    });
  }, []);

  const isCurrentFy = complianceYear === getCurrentComplianceYear();

  const loadServices = useCallback(async () => {
    try {
      const res = await fetchComplianceServices({ page_no: 1, limit: 100 });
      const list = Array.isArray(res?.data) ? res.data : [];
      setServices(list);
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load compliance services'));
      setServices([]);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplianceTaskList({
        service_id: serviceId,
        compliance_year: complianceYear,
        compliance_period: compliancePeriod,
        page_no: pagination.page,
        limit: pagination.limit,
      });
      setRows(res.data);
      setPagination((prev) => ({ ...prev, ...res.pagination }));
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load compliance tasks'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [serviceId, complianceYear, compliancePeriod, pagination.page, pagination.limit]);

  const loadFirms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplianceFirms({
        service_id: serviceId,
        search,
        page_no: pagination.page,
        limit: pagination.limit,
      });
      setRows(res.data);
      setPagination((prev) => ({ ...prev, ...res.pagination }));
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load compliance firms'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [serviceId, search, pagination.page, pagination.limit]);

  const reloadList = useCallback(() => {
    if (activeView === 'tasks') loadTasks();
    else loadFirms();
  }, [activeView, loadTasks, loadFirms]);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setRows([]);
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'tasks') loadTasks();
    else loadFirms();
  }, [activeView, loadTasks, loadFirms]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearch(searchInput.trim());
  };

  const handleStatusChange = async (row, nextStatus) => {
    if (!nextStatus) return;

    if (row.status === 'complete') {
      toast.error('Completed tasks cannot be changed');
      return;
    }

    const rowKey = taskRowKey(row);
    setStatusUpdatingKey(rowKey);
    try {
      const res = await changeComplianceTaskStatus({
        service_id: row.service_id,
        firm_id: row.firm_id,
        status: nextStatus,
        compliance_year: row.compliance_year,
        compliance_period: row.compliance_period,
      });
      const saved = res?.data || {};
      setRows((prev) =>
        prev.map((item) =>
          taskRowKey(item) === rowKey
            ? {
                ...item,
                has_task: true,
                task_id: saved.task_id ?? item.task_id,
                status: saved.status || nextStatus,
              }
            : item,
        ),
      );
      toast.success(res?.message || 'Task status updated');
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to update task status'));
    } finally {
      setStatusUpdatingKey(null);
    }
  };

  const handleSaveFirm = async (form) => {
    setFirmSaving(true);
    try {
      if (firmModal?.mode === 'add') {
        const res = await addComplianceFirm({
          service_id: form.service_id,
          firm_id: form.firm_id,
          effective_from: form.effective_from,
          fees: form.fees,
          tax_rate: form.tax_rate,
          due_date: form.due_date,
          staffs: form.staffs,
          ca: form.ca,
          agent: form.agent,
        });
        toast.success(res?.message || 'Compliance firm added');
      } else {
        const firmId = firmModal.firm.id ?? firmModal.firm.compliance_firm_id;
        const res = await editComplianceFirm({
          id: firmId,
          fees: form.fees,
          tax_rate: form.tax_rate,
          due_date: form.due_date,
          staffs: form.staffs,
          ca: form.ca,
          agent: form.agent,
        });
        toast.success(res?.message || 'Compliance firm updated');
      }
      setFirmModal(null);
      reloadList();
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to save compliance firm'));
    } finally {
      setFirmSaving(false);
    }
  };

  const handleDeleteFirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const firmId = deleteTarget.id ?? deleteTarget.compliance_firm_id;
      const res = await deleteComplianceFirm({ id: firmId });
      toast.success(res?.message || 'Compliance firm deleted');
      setDeleteTarget(null);
      reloadList();
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to delete compliance firm'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const switchView = (view) => {
    setActiveView(view);
    setPagination((prev) => ({ ...prev, page: 1 }));
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
        className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link to="/" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
              <FiHome className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Compliance</span>
          </nav>

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Compliance</h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeView === 'tasks'
                  ? 'Task board — one row per firm per period'
                  : 'Firm assignments — one row per service assignment'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFirmModal({ mode: 'add' })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0"
            >
              <FiPlus className="w-4 h-4" />
              Add firm
            </button>
          </div>

          <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => switchView('tasks')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'tasks'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Task board
            </button>
            <button
              type="button"
              onClick={() => switchView('firms')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'firms'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Firm assignments
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
                  <select
                    value={serviceId}
                    onChange={(e) => {
                      setServiceId(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">All services</option>
                    {branchServices.map((service) => (
                      <option key={service.service_id} value={service.service_id}>
                        {service.service_name || service.service_id}
                      </option>
                    ))}
                  </select>
                </div>

                {activeView === 'tasks' ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Compliance year
                      </label>
                      <select
                        value={complianceYear}
                        onChange={(e) => {
                          setComplianceYear(e.target.value);
                          setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
                      <select
                        value={compliancePeriod}
                        onChange={(e) => {
                          setCompliancePeriod(e.target.value);
                          setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        disabled={!selectedService}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
                      >
                        <option value="">
                          {isCurrentFy ? 'All periods (recent window)' : 'All periods in year'}
                        </option>
                        {periodOptions.map((period) => (
                          <option key={period} value={period}>
                            {period}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}

                {activeView === 'firms' ? (
                  <form onSubmit={handleSearch} className="md:col-span-2 xl:col-span-3 flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          placeholder="Firm, client, PAN, GST..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                    >
                      Search
                    </button>
                  </form>
                ) : null}

                <div className={`flex items-end ${activeView === 'tasks' ? '' : 'hidden'}`}>
                  <button
                    type="button"
                    onClick={reloadList}
                    disabled={loading}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    title="Refresh"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {activeView === 'tasks' && selectedService ? (
                <p className="text-xs text-gray-500 m-0">
                  {selectedService.service_name} · {selectedService.frequency || 'monthly'}
                  {!compliancePeriod && isCurrentFy
                    ? ' · Showing recent periods (server window)'
                    : !compliancePeriod
                      ? ' · Showing all periods in selected year'
                      : ''}
                </p>
              ) : null}

              {activeView === 'firms' ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={reloadList}
                    disabled={loading}
                    className="inline-flex items-center gap-2 p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-sm"
                    title="Refresh"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              {activeView === 'tasks' ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Firm / Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Due date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Fees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Staff
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          {Array.from({ length: 8 }).map((__, cellIndex) => (
                            <td key={cellIndex} className="px-6 py-4">
                              <div className="h-4 bg-gray-200 rounded w-full max-w-[160px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                          No compliance tasks found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const rowKey = taskRowKey(row);
                        const currentStatus = row.status || '';
                        const isComplete = currentStatus === 'complete';
                        const isUpdating = statusUpdatingKey === rowKey;

                        return (
                          <tr key={rowKey} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900 m-0">
                                {row.compliance_period}
                              </p>
                              <p className="text-xs text-gray-500 m-0 mt-0.5">{row.compliance_year}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900 m-0">
                                {row.firm_name || row.firm_id}
                              </p>
                              <p className="text-xs text-gray-500 m-0 mt-0.5">
                                {row.service_name || row.service_id}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-800 m-0">
                                {row.client?.name || row.username || '—'}
                              </p>
                              <p className="text-xs text-gray-500 m-0 mt-0.5">
                                {row.client?.mobile || row.client?.email || '—'}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.due_date || '—'}
                              {row.due_day ? (
                                <div className="text-xs text-gray-500">Day {row.due_day}</div>
                              ) : null}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              <div>{formatMoney(row.fees)}</div>
                              <div className="text-xs text-gray-500">
                                Tax {row.tax_rate}% ({formatMoney(row.tax_value)})
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              <div className="max-w-[140px] truncate">
                                {normalizeAssignees(row.staffs).join(', ') || '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2 min-w-[180px]">
                                <StatusBadge status={currentStatus} />
                                {!row.has_task && !currentStatus ? (
                                  <p className="text-xs text-gray-500 m-0">No task yet</p>
                                ) : null}
                                <select
                                  value={currentStatus}
                                  onChange={(e) => handleStatusChange(row, e.target.value)}
                                  disabled={isUpdating || isComplete}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
                                >
                                  <option value="">Set status</option>
                                  {COMPLIANCE_TASK_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                                {isUpdating ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                    <FiLoader className="w-3.5 h-3.5 animate-spin" />
                                    Updating...
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFirmModal({ mode: 'edit', firm: taskRowToFirm(row) })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                >
                                  <FiEdit2 className="w-3.5 h-3.5" />
                                  Edit firm
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Firm / Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Fees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Due day
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Effective from
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Staff
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          {Array.from({ length: 7 }).map((__, cellIndex) => (
                            <td key={cellIndex} className="px-6 py-4">
                              <div className="h-4 bg-gray-200 rounded w-full max-w-[160px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                          No compliance firm assignments found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900 m-0">
                              {row.firm_name || row.firm_id}
                            </p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5">
                              {row.service_name || row.service_id}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-800 m-0">
                              {row.client?.name || row.username || '—'}
                            </p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5">
                              {row.client?.mobile || row.client?.email || '—'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                            <div>{formatMoney(row.fees)}</div>
                            <div className="text-xs text-gray-500">
                              Tax {row.tax_rate}% ({formatMoney(row.tax_value)})
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            Day {row.due_date || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                            {row.effective_from || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="max-w-[180px] truncate">
                              {normalizeAssignees(row.staffs).join(', ') || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setFirmModal({ mode: 'edit', firm: row })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && pagination.total_pages > 1 ? (
              <div className="px-6 py-4 border-t border-gray-200">
                <TablePagination
                  page={pagination.page}
                  limit={pagination.limit}
                  total={pagination.total}
                  totalPages={pagination.total_pages}
                  onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                  onLimitChange={(limit) =>
                    setPagination((prev) => ({ ...prev, limit, page: 1 }))
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FirmFormModal
        isOpen={Boolean(firmModal)}
        mode={firmModal?.mode || 'add'}
        initialFirm={firmModal?.firm}
        services={branchServices}
        saving={firmSaving}
        yearOptions={yearOptions}
        onClose={() => !firmSaving && setFirmModal(null)}
        onSubmit={handleSaveFirm}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={deleteLoading ? undefined : () => setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 m-0">Delete compliance firm?</h3>
            <p className="text-sm text-gray-600 mt-2 m-0">
              Remove <strong>{deleteTarget.firm_name || deleteTarget.firm_id}</strong> from{' '}
              <strong>{deleteTarget.service_name || deleteTarget.service_id}</strong>? This is a soft
              delete.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFirm}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {deleteLoading ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ComplianceServices;
