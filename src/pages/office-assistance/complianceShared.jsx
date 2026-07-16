import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TbCurrencyRupee } from 'react-icons/tb';
import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiLayers,
  FiLoader,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import CustomSelect from '../../components/CustomSelect';
import { formatMemberSelectedLabel } from '../task-create/SearchablePickField';
import {
  buildEffectiveFrom,
  COMPLIANCE_MONTHS,
  extractApiError,
  fetchAgentOptions,
  fetchCaOptions,
  fetchStaffOptions,
  getDefaultEffectiveFromFields,
  HALF_YEARLY_PERIODS,
  mapFirmSelectOption,
  mergeYearOptionsForEffectiveFrom,
  normalizeAssignees,
  normalizeFrequency,
  parseEffectiveFromFields,
  QUARTERLY_PERIODS,
  searchFirmSelectOptions,
} from '../../services/complianceService';

const GST_RATE_OPTIONS = [0, 5, 12, 18, 28];

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 bg-white';

const sectionClass =
  'rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 space-y-4';

const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toMemberSelectOption = (member) => ({
  label: formatMemberSelectedLabel(member),
  value: member.username,
  username: member.username,
  name: member.name,
  mobile: member.mobile,
});

const buildCalendarYearOptions = (yearOptions, selectedYear) => {
  const calendarYears = (yearOptions || []).flatMap((year) => {
    const [start, end] = year.split('-').map(Number);
    return [start, end].filter(Number.isFinite);
  });
  const uniqueYears = [...new Set(calendarYears)];
  const yearNum = Number(selectedYear);
  if (Number.isFinite(yearNum) && !uniqueYears.includes(yearNum)) {
    uniqueYears.push(yearNum);
    uniqueYears.sort((a, b) => a - b);
  }
  return uniqueYears.map((year) => ({ value: year, label: String(year) }));
};

const buildFyYearOptions = (yearOptions, fyStart, fyEnd) => {
  const options = [...(yearOptions || [])];
  if (Number.isFinite(fyStart) && Number.isFinite(fyEnd)) {
    const fy = `${fyStart}-${fyEnd}`;
    if (!options.includes(fy)) options.unshift(fy);
  }
  return options.map((year) => ({ value: year, label: year }));
};

const buildFyStartYearOptions = (yearOptions, fyStartYear) => {
  const options = [...(yearOptions || [])];
  const yearNum = Number(fyStartYear);
  if (Number.isFinite(yearNum)) {
    const fyLabel = `${yearNum}-${yearNum + 1}`;
    if (!options.includes(fyLabel)) options.push(fyLabel);
  }
  return [...new Set(options)]
    .sort()
    .map((year) => {
      const fyStart = Number(year.split('-')[0]);
      return { value: fyStart, label: `${fyStart} (FY ${year})` };
    });
};

const StaffAssignPanel = ({
  allStaff,
  selectedUsernames,
  onChange,
  disabled,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selectedUsernames), [selectedUsernames]);

  const selectedEmployees = useMemo(
    () => allStaff.filter((member) => selectedSet.has(member.username)),
    [allStaff, selectedSet],
  );

  const filteredAvailable = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allStaff.filter((member) => {
      if (selectedSet.has(member.username)) return false;
      if (!query) return true;
      const haystack = [
        member.name,
        member.username,
        member.mobile,
        member.department,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [allStaff, selectedSet, searchQuery]);

  const addEmployee = (member) => {
    if (disabled || selectedSet.has(member.username)) return;
    onChange([...selectedUsernames, member.username]);
  };

  const removeEmployee = (member) => {
    if (disabled) return;
    onChange(selectedUsernames.filter((username) => username !== member.username));
  };

  const addAllEmployees = () => {
    if (disabled) return;
    const next = new Set(selectedUsernames);
    filteredAvailable.forEach((member) => next.add(member.username));
    onChange([...next]);
  };

  const removeAllEmployees = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <FiUsers className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 m-0">Assign staff</p>
          <p className="text-xs text-gray-500 m-0">Select employees responsible for this firm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] gap-2">
        <div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[340px] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-sm font-medium text-gray-700 m-0">Available employees</h3>
              <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">
                {filteredAvailable.length}
              </span>
            </div>
            <div className="relative mb-2 shrink-0">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile, designation..."
                disabled={disabled}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60"
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-8">
                  <FiLoader className="w-4 h-4 animate-spin" />
                  Loading staff...
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  {searchQuery.trim() ? 'No matching employees' : 'No employees available'}
                </div>
              ) : (
                filteredAvailable.map((employee) => (
                  <button
                    key={employee.username}
                    type="button"
                    onClick={() => addEmployee(employee)}
                    disabled={disabled}
                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-60"
                  >
                    <div className="font-medium text-sm text-gray-800">{employee.name}</div>
                    <div className="text-sm text-gray-400">
                      {[employee.department, employee.mobile].filter(Boolean).join(' • ') || '—'}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex lg:flex-col justify-center items-center gap-2 py-1">
          <motion.button
            type="button"
            onClick={addAllEmployees}
            disabled={disabled || filteredAvailable.length === 0}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.9 }}
          >
            <FiArrowRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            type="button"
            onClick={removeAllEmployees}
            disabled={disabled || selectedEmployees.length === 0}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.9 }}
          >
            <FiArrowLeft className="w-4 h-4" />
          </motion.button>
        </div>

        <div>
          <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-4 min-h-[340px] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-sm font-medium text-gray-700 m-0">Selected employees</h3>
              <span className="text-sm text-violet-700 bg-white px-2 py-1 rounded-lg border border-violet-100">
                {selectedEmployees.length}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {selectedEmployees.map((employee) => (
                <button
                  key={employee.username}
                  type="button"
                  onClick={() => removeEmployee(employee)}
                  disabled={disabled}
                  className="w-full text-left p-3 bg-white border border-violet-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-60"
                >
                  <div className="font-medium text-sm text-gray-800">{employee.name}</div>
                  <div className="text-sm text-gray-400">
                    {[employee.department, employee.mobile].filter(Boolean).join(' • ') || '—'}
                  </div>
                </button>
              ))}
              {!loading && selectedEmployees.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">No employees selected</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EffectiveFromField = ({ frequency, value, onChange, disabled, yearOptions }) => {
  const normalized = normalizeFrequency(frequency);

  if (normalized === 'yearly') {
    const fyOptions = buildFyYearOptions(yearOptions, value.fyStart, value.fyEnd);
    const fyValue = Number.isFinite(value.fyStart) && Number.isFinite(value.fyEnd)
      ? `${value.fyStart}-${value.fyEnd}`
      : fyOptions[0]?.value || '';

    return (
      <CustomSelect
        label="Effective from (FY)"
        required
        options={fyOptions}
        value={fyOptions.find((option) => option.value === fyValue) || null}
        onChange={(option) => {
          const [fyStart, fyEnd] = String(option?.value || '').split('-').map(Number);
          onChange({ ...value, fyStart, fyEnd });
        }}
        placeholder="Select financial year"
        isDisabled={disabled}
        isClearable={false}
        isSearchable={false}
      />
    );
  }

  if (normalized === 'quarterly') {
    const resolvedYearOptions = buildFyStartYearOptions(yearOptions, value.fyStartYear);
    const fyStartYearValue = Number.isFinite(Number(value.fyStartYear))
      ? Number(value.fyStartYear)
      : Number(resolvedYearOptions[0]?.value) || '';

    return (
      <div className="sm:col-span-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomSelect
            label="Effective from quarter"
            required
            options={QUARTERLY_PERIODS.map((period) => ({ value: period, label: period }))}
            value={{ value: value.period || QUARTERLY_PERIODS[0], label: value.period || QUARTERLY_PERIODS[0] }}
            onChange={(option) => onChange({ ...value, period: option?.value || QUARTERLY_PERIODS[0] })}
            isDisabled={disabled}
            isClearable={false}
            isSearchable={false}
          />
          <CustomSelect
            label="FY start year"
            required
            options={resolvedYearOptions}
            value={resolvedYearOptions.find((option) => option.value === fyStartYearValue) || null}
            onChange={(option) => onChange({ ...value, fyStartYear: Number(option?.value) })}
            isDisabled={disabled}
            isClearable={false}
            isSearchable={false}
          />
        </div>
      </div>
    );
  }

  if (normalized === 'half-yearly') {
    const resolvedYearOptions = buildFyStartYearOptions(yearOptions, value.fyStartYear);
    const fyStartYearValue = Number.isFinite(Number(value.fyStartYear))
      ? Number(value.fyStartYear)
      : Number(resolvedYearOptions[0]?.value) || '';

    return (
      <div className="sm:col-span-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomSelect
            label="Effective from half"
            required
            options={HALF_YEARLY_PERIODS.map((period) => ({ value: period, label: period }))}
            value={{ value: value.period || HALF_YEARLY_PERIODS[0], label: value.period || HALF_YEARLY_PERIODS[0] }}
            onChange={(option) => onChange({ ...value, period: option?.value || HALF_YEARLY_PERIODS[0] })}
            isDisabled={disabled}
            isClearable={false}
            isSearchable={false}
          />
          <CustomSelect
            label="FY start year"
            required
            options={resolvedYearOptions}
            value={resolvedYearOptions.find((option) => option.value === fyStartYearValue) || null}
            onChange={(option) => onChange({ ...value, fyStartYear: Number(option?.value) })}
            isDisabled={disabled}
            isClearable={false}
            isSearchable={false}
          />
        </div>
      </div>
    );
  }

  const uniqueYears = buildCalendarYearOptions(yearOptions, value.year);
  const monthValue = value.month || COMPLIANCE_MONTHS[0];
  const yearValue = Number.isFinite(Number(value.year)) ? Number(value.year) : uniqueYears[0]?.value;

  return (
    <div className="sm:col-span-2 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CustomSelect
          label="Effective from month"
          required
          options={COMPLIANCE_MONTHS.map((month) => ({ value: month, label: month }))}
          value={{ value: monthValue, label: monthValue }}
          onChange={(option) => onChange({ ...value, month: option?.value || COMPLIANCE_MONTHS[0] })}
          isDisabled={disabled}
          isClearable={false}
          isSearchable={false}
        />
        <CustomSelect
          label="Year"
          required
          options={uniqueYears}
          value={uniqueYears.find((option) => option.value === yearValue) || null}
          onChange={(option) => onChange({ ...value, year: Number(option?.value) })}
          isDisabled={disabled}
          isClearable={false}
          isSearchable={false}
        />
      </div>
    </div>
  );
};

export const FirmFormModal = ({
  isOpen,
  mode,
  initialFirm,
  services,
  saving,
  onClose,
  onSubmit,
  yearOptions,
  clientUsername = '',
  presetFirmOptions = null,
  defaultServiceId = '',
  defaultFirmId = '',
  addTitle,
  editTitle,
}) => {
  const [form, setForm] = useState({
    service_id: '',
    firm_id: '',
    fees: '',
    tax_rate: '18',
    due_date: '10',
    visibility_offset: '0',
    staffs: [],
    ca: '',
    agent: '',
  });
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [caMembers, setCaMembers] = useState([]);
  const [agentMembers, setAgentMembers] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [effectiveFromFields, setEffectiveFromFields] = useState(() =>
    getDefaultEffectiveFromFields('monthly'),
  );

  const selectedFormService = useMemo(
    () => services.find((item) => item.service_id === form.service_id) || null,
    [services, form.service_id],
  );

  const serviceOptions = useMemo(
    () =>
      services.map((service) => ({
        value: service.service_id,
        label: service.service_name || service.name || service.service_id,
        frequency: service.frequency,
      })),
    [services],
  );

  const taxRateOptions = useMemo(
    () => GST_RATE_OPTIONS.map((rate) => ({ value: String(rate), label: `${rate}%` })),
    [],
  );

  const caOptions = useMemo(
    () => caMembers.map((member) => toMemberSelectOption(member)),
    [caMembers],
  );

  const agentOptions = useMemo(
    () => agentMembers.map((member) => toMemberSelectOption(member)),
    [agentMembers],
  );

  const selectedServiceOption = useMemo(
    () => serviceOptions.find((option) => option.value === form.service_id) || null,
    [serviceOptions, form.service_id],
  );

  const selectedFirmOption = useMemo(() => {
    if (selectedFirm && selectedFirm.value === form.firm_id) {
      return selectedFirm;
    }
    if (!form.firm_id) return null;
    if (initialFirm?.firm_id === form.firm_id) {
      return mapFirmSelectOption({
        firm_id: initialFirm.firm_id,
        firm_name: initialFirm.firm_name,
        pan_no: initialFirm.pan_no,
      });
    }
    return mapFirmSelectOption({ firm_id: form.firm_id, firm_name: form.firm_id });
  }, [selectedFirm, form.firm_id, initialFirm]);

  const loadFirmOptions = useCallback(async (search, page = 1) => {
    const limit = 30;

    if (Array.isArray(presetFirmOptions)) {
      const query = String(search || '').trim().toLowerCase();
      const filtered = presetFirmOptions.filter((option) => {
        if (!query) return true;
        return String(option.label || '').toLowerCase().includes(query);
      });
      const start = (page - 1) * limit;
      const options = filtered.slice(start, start + limit);
      return {
        options,
        hasMore: start + limit < filtered.length,
      };
    }

    return searchFirmSelectOptions({
      search,
      page_no: page,
      limit,
      username: clientUsername,
    });
  }, [clientUsername, presetFirmOptions]);

  const selectedTaxRateOption = useMemo(
    () => taxRateOptions.find((option) => option.value === String(form.tax_rate)) || null,
    [taxRateOptions, form.tax_rate],
  );

  const selectedCaOption = useMemo(() => {
    if (!form.ca) return null;
    return (
      caOptions.find((option) => option.value === form.ca) ||
      toMemberSelectOption({ username: form.ca, name: form.ca })
    );
  }, [caOptions, form.ca]);

  const selectedAgentOption = useMemo(() => {
    if (!form.agent) return null;
    return (
      agentOptions.find((option) => option.value === form.agent) ||
      toMemberSelectOption({ username: form.agent, name: form.agent })
    );
  }, [agentOptions, form.agent]);

  const resolvedYearOptions = useMemo(() => {
    const frequency = selectedFormService?.frequency;
    const effectiveFrom = mode === 'edit' ? initialFirm?.effective_from : '';
    return mergeYearOptionsForEffectiveFrom(yearOptions || [], frequency, effectiveFrom);
  }, [yearOptions, mode, initialFirm?.effective_from, selectedFormService?.frequency]);

  const handleServiceChange = (option) => {
    const newServiceId = option?.value || '';
    const newService = services.find((item) => item.service_id === newServiceId);
    setForm((prev) => ({ ...prev, service_id: newServiceId }));

    if (!newService) return;

    if (mode === 'add') {
      setEffectiveFromFields(getDefaultEffectiveFromFields(newService.frequency));
      return;
    }

    if (newServiceId === initialFirm?.service_id && initialFirm?.effective_from) {
      setEffectiveFromFields(
        parseEffectiveFromFields(newService.frequency, initialFirm.effective_from),
      );
    } else {
      setEffectiveFromFields(getDefaultEffectiveFromFields(newService.frequency));
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initialFirm) {
      const editService = services.find((item) => item.service_id === initialFirm.service_id) || services[0];
      setSelectedFirm(mapFirmSelectOption({
        firm_id: initialFirm.firm_id,
        firm_name: initialFirm.firm_name,
        pan_no: initialFirm.pan_no,
      }));
      setForm({
        service_id: initialFirm.service_id || '',
        firm_id: initialFirm.firm_id || '',
        fees: String(initialFirm.fees ?? ''),
        tax_rate: String(initialFirm.tax_rate ?? '18'),
        due_date: String(initialFirm.due_date ?? '10'),
        visibility_offset: String(initialFirm.visibility_offset ?? '0'),
        staffs: normalizeAssignees(initialFirm.staffs),
        ca: normalizeAssignees(initialFirm.ca)[0] || '',
        agent: normalizeAssignees(initialFirm.agent)[0] || '',
      });
      setEffectiveFromFields(
        parseEffectiveFromFields(editService?.frequency, initialFirm.effective_from),
      );
    } else {
      const defaultService =
        services.find((item) => item.service_id === defaultServiceId) || services[0];
      setSelectedFirm(
        defaultFirmId
          ? mapFirmSelectOption({ firm_id: defaultFirmId, firm_name: defaultFirmId })
          : null,
      );
      setForm({
        service_id: defaultServiceId || defaultService?.service_id || '',
        firm_id: defaultFirmId || '',
        fees: '',
        tax_rate: '18',
        due_date: '10',
        visibility_offset: '0',
        staffs: [],
        ca: '',
        agent: '',
      });
      setEffectiveFromFields(getDefaultEffectiveFromFields(defaultService?.frequency));
    }
  }, [isOpen, mode, initialFirm, services, defaultServiceId, defaultFirmId]);

  useEffect(() => {
    if (!isOpen || mode !== 'add' || !selectedFormService) return;
    setEffectiveFromFields(getDefaultEffectiveFromFields(selectedFormService.frequency));
  }, [isOpen, mode, selectedFormService]);

  useEffect(() => {
    if (!isOpen) {
      setOptionsLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const [staffRes, caRes, agentRes] = await Promise.allSettled([
          fetchStaffOptions({ page: 1, limit: 200 }),
          fetchCaOptions({ page: 1, limit: 200 }),
          fetchAgentOptions({ page: 1, limit: 200 }),
        ]);

        if (cancelled) return;

        if (staffRes.status === 'fulfilled') {
          setStaffMembers(staffRes.value?.data || []);
        } else {
          setStaffMembers([]);
          toast.error(extractApiError(staffRes.reason, 'Failed to load staff'));
        }

        if (caRes.status === 'fulfilled') {
          setCaMembers(caRes.value?.data || []);
        } else {
          setCaMembers([]);
        }

        if (agentRes.status === 'fulfilled') {
          setAgentMembers(agentRes.value?.data || []);
        } else {
          setAgentMembers([]);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(extractApiError(error, 'Failed to load form options'));
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const fees = Number(form.fees);
    const due_date = Number(form.due_date);
    const visibility_offset = Number(form.visibility_offset);

    if (!form.service_id || !form.firm_id) {
      toast.error('Service and firm are required');
      return;
    }

    if (!Number.isFinite(fees) || fees < 0) {
      toast.error('Enter a valid fees amount');
      return;
    }
    if (!Number.isInteger(due_date) || due_date < 1 || due_date > 31) {
      toast.error('Due date must be between 1 and 31');
      return;
    }
    if (!Number.isInteger(visibility_offset)) {
      toast.error('Visibility offset must be an integer');
      return;
    }

    if (!selectedFormService) {
      toast.error('Select a compliance service');
      return;
    }

    const effective_from = buildEffectiveFrom(selectedFormService.frequency, effectiveFromFields);
    if (!effective_from) {
      toast.error('Effective from is required');
      return;
    }

    onSubmit({
      ...form,
      fees,
      due_date,
      visibility_offset,
      effective_from,
      ca: form.ca ? [form.ca] : [],
      agent: form.agent ? [form.agent] : [],
    });
  };

  const modalTitle = mode === 'add'
    ? (addTitle || 'Add compliance firm')
    : (editTitle || 'Edit compliance firm');

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={modalTitle}
      compactHeader
      size="xl"
      bodyClassName="p-5"
      footer={(
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="compliance-firm-form"
            disabled={saving || optionsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
          >
            {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiBriefcase className="w-4 h-4" />}
            {mode === 'add' ? 'Add firm' : 'Save changes'}
          </button>
        </div>
      )}
    >
      <form id="compliance-firm-form" onSubmit={handleSubmit} className="space-y-5">
        {optionsLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-10">
            <FiLoader className="w-4 h-4 animate-spin" />
            Loading options...
          </div>
        ) : (
          <>
            <div className={sectionClass}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <FiLayers className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 m-0">Service & firm</p>
                  <p className="text-xs text-gray-500 m-0">Choose the compliance service and client firm</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="Service"
                  required
                  options={serviceOptions}
                  value={selectedServiceOption}
                  onChange={handleServiceChange}
                  placeholder="Select compliance service"
                  searchPlaceholder="Search services..."
                  noOptionsMessage="No compliance services found"
                  isDisabled={saving}
                  isClearable={false}
                />

                <CustomSelect
                  label="Firm"
                  required
                  loadOptions={loadFirmOptions}
                  value={selectedFirmOption}
                  onChange={(option) => {
                    setSelectedFirm(option || null);
                    setForm((prev) => ({ ...prev, firm_id: option?.value || '' }));
                  }}
                  placeholder={clientUsername ? 'Select client firm' : 'Select firm'}
                  searchPlaceholder="Search by firm name or PAN..."
                  noOptionsMessage={clientUsername ? 'No firms for this client' : 'No firms available'}
                  isDisabled={saving}
                  isClearable={false}
                />

                {selectedFormService ? (
                  <EffectiveFromField
                    frequency={selectedFormService.frequency}
                    value={effectiveFromFields}
                    onChange={setEffectiveFromFields}
                    disabled={saving}
                    yearOptions={resolvedYearOptions}
                  />
                ) : null}
              </div>
            </div>

            <div className={sectionClass}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TbCurrencyRupee className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 m-0">Fees & schedule</p>
                  <p className="text-xs text-gray-500 m-0">Set billing amount, tax, and due day</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>
                    Fees <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <TbCurrencyRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.fees}
                      onChange={(e) => setForm((prev) => ({ ...prev, fees: e.target.value }))}
                      disabled={saving}
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Due day of month <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.due_date}
                      onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                      disabled={saving}
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Visibility offset
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={form.visibility_offset}
                    onChange={(e) => setForm((prev) => ({ ...prev, visibility_offset: e.target.value }))}
                    disabled={saving}
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500 mt-1 m-0">
                    Negative shows the current ongoing period. Zero or positive shows from the due month.
                  </p>
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelect
                  label="CA"
                  options={caOptions}
                  value={selectedCaOption}
                  onChange={(option) => setForm((prev) => ({ ...prev, ca: option?.value || '' }))}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Search CA by name or mobile..."
                  searchPlaceholder="Search CA..."
                  noOptionsMessage="No CA found"
                  isDisabled={saving}
                  isClearable
                />
                <CustomSelect
                  label="Agent"
                  options={agentOptions}
                  value={selectedAgentOption}
                  onChange={(option) => setForm((prev) => ({ ...prev, agent: option?.value || '' }))}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Search agent by name or mobile..."
                  searchPlaceholder="Search agent..."
                  noOptionsMessage="No agent found"
                  isDisabled={saving}
                  isClearable
                />
              </div>
            </div>

            <div className={sectionClass}>
              <StaffAssignPanel
                allStaff={staffMembers}
                selectedUsernames={form.staffs}
                onChange={(staffs) => setForm((prev) => ({ ...prev, staffs }))}
                disabled={saving}
                loading={optionsLoading}
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
