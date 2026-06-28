import React, { useEffect, useMemo, useState } from 'react';
import { FiLoader, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import {
  buildEffectiveFrom,
  COMPLIANCE_MONTHS,
  extractApiError,
  fetchAgentOptions,
  fetchCaOptions,
  fetchFirmOptions,
  fetchStaffOptions,
  getDefaultEffectiveFromFields,
  HALF_YEARLY_PERIODS,
  normalizeAssignees,
  normalizeFrequency,
  QUARTERLY_PERIODS,
} from '../../services/complianceService';

const GST_RATE_OPTIONS = [0, 5, 12, 18, 28];

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

export const FirmFormModal = ({ isOpen, mode, initialFirm, services, saving, onClose, onSubmit, yearOptions }) => {
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
                        {service.service_name || service.name || service.service_id}
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
