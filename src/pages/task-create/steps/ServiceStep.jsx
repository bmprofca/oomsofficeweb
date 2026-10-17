import React, { useCallback, useMemo } from 'react';
import { FiBriefcase, FiCalendar } from 'react-icons/fi';
import { DatePickerField } from '../../../components/PortalDatePicker';
import { FormField, FormSection, Toggle, inputClass } from '../../../components/Modals/WizardModalParts';
import CustomSelect from '../../../components/CustomSelect';
import {
    formatMoney,
    getServiceAmounts,
    parseAmount,
    sanitizeFeesInput,
} from '../taskCreateConstants';
import {
    fetchTaskCreateServiceList,
    mapServiceListToSelectOptions,
    mapServiceToSelectOption,
} from '../taskCreateServiceList';

const DATE_BTN_CLASS = 'min-h-[42px] text-left';

function serviceFeeSummary(service, feesInput) {
    const gstRate = parseAmount(service?.gst_rate);
    const fees = parseAmount(feesInput);
    const gstValue =
        gstRate > 0
            ? Math.round(((fees * gstRate) / 100) * 100) / 100
            : parseAmount(service?.gst_value);
    return { fees, gstRate, gstValue, total: fees + gstValue };
}

export default function ServiceStep({
    form,
    setForm,
    selectedService,
    setSelectedService,
    assessmentYears,
    financialYears,
    toggleYear,
    lockedFields = {},
    estimatedTaskCreateCount = 1,
    fieldError = null,
    fieldRefs = {},
}) {
    const serviceLocked = Boolean(lockedFields.service);
    const taskCount = Math.max(1, estimatedTaskCreateCount || 1);
    const err = (field) => fieldError?.field === field;

    const serviceValue = useMemo(
        () => (selectedService ? mapServiceToSelectOption(selectedService) : null),
        [selectedService]
    );

    const loadServiceOptions = useCallback(async (query) => {
        const result = await fetchTaskCreateServiceList({
            search: query,
            page_no: 1,
            limit: 100,
        });
        const rows = Array.isArray(result?.data) ? result.data : [];
        return mapServiceListToSelectOptions(rows);
    }, []);

    const amounts = useMemo(
        () => serviceFeeSummary(selectedService, form.fees),
        [selectedService, form.fees]
    );

    const renderServiceOption = (option) => {
        const { fees, gstRate, gstValue, total } = getServiceAmounts(option);
        const gstPart =
            gstValue > 0 ? ` · GST ${gstRate}% ₹${formatMoney(gstValue)}` : '';
        return (
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium truncate">{option.name}</span>
                <span className="text-xs text-gray-500 truncate">
                    {`₹${formatMoney(fees)}${gstPart} · Total ₹${formatMoney(total)}`}
                </span>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <FormSection title="Service" description="Fees are pre-filled from the service — change them if needed." icon={FiBriefcase}>
                <div className="space-y-4">
                    <div ref={fieldRefs.service}>
                        <CustomSelect
                            label="Service"
                            required
                            loadOptions={loadServiceOptions}
                            defaultOptions
                            minSearchLength={0}
                            value={serviceValue}
                            onChange={(option) => {
                                if (serviceLocked) return;
                                if (!option) {
                                    setSelectedService(null);
                                    setForm((prev) => ({ ...prev, service_id: '', fees: '' }));
                                    return;
                                }
                                setSelectedService({
                                    service_id: option.service_id,
                                    name: option.name,
                                    displayName: option.name,
                                    fees: option.fees,
                                    gst_rate: option.gst_rate,
                                    gst_value: option.gst_value,
                                });
                                setForm((prev) => ({
                                    ...prev,
                                    service_id: option.service_id,
                                    fees: option.fees != null ? sanitizeFeesInput(String(option.fees)) : prev.fees,
                                }));
                            }}
                            getOptionLabel={(option) => option.label}
                            getOptionValue={(option) => option.value}
                            renderOption={renderServiceOption}
                            placeholder="Search and select service..."
                            searchPlaceholder="Search services..."
                            noOptionsMessage="No branch services found"
                            loadingMessage="Loading services..."
                            isDisabled={serviceLocked}
                            isClearable={!serviceLocked}
                            error={err('service') ? fieldError.message : undefined}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div ref={fieldRefs.fees}>
                            <FormField label="Fees (₹)" required error={err('fees') ? fieldError.message : null} hint="Per task, before GST">
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.fees}
                                        onChange={(e) => setForm((p) => ({ ...p, fees: sanitizeFeesInput(e.target.value) }))}
                                        onBlur={() => {
                                            const str = String(form.fees || '').trim();
                                            if (str && /^\d+(\.\d+)?$/.test(str)) {
                                                setForm((p) => ({ ...p, fees: parseAmount(str).toFixed(2) }));
                                            }
                                        }}
                                        className={inputClass(err('fees'), 'pl-8 font-mono tabular-nums')}
                                        placeholder="0.00"
                                    />
                                </div>
                            </FormField>
                        </div>
                        <div ref={fieldRefs.due_date}>
                            <FormField label="Due date" required error={err('due_date') ? fieldError.message : null}>
                                <DatePickerField
                                    value={form.due_date}
                                    onChange={(val) => setForm((p) => ({ ...p, due_date: typeof val === 'string' ? val : '' }))}
                                    placeholder="Select due date"
                                    mode="single"
                                    initialTab="single"
                                    quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                                    wrapperClassName="w-full block"
                                    buttonClassName={inputClass(err('due_date'), DATE_BTN_CLASS)}
                                />
                            </FormField>
                        </div>
                    </div>

                    {form.fees && parseAmount(form.fees) >= 0 && (
                        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
                            <div className="bg-white px-3 py-2.5">
                                <dt className="text-[11px] font-medium text-slate-500">Fees</dt>
                                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">₹{formatMoney(amounts.fees)}</dd>
                            </div>
                            <div className="bg-white px-3 py-2.5">
                                <dt className="text-[11px] font-medium text-slate-500">GST{amounts.gstRate ? ` (${amounts.gstRate}%)` : ''}</dt>
                                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">₹{formatMoney(amounts.gstValue)}</dd>
                            </div>
                            <div className="bg-white px-3 py-2.5">
                                <dt className="text-[11px] font-medium text-slate-500">Total per task</dt>
                                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-indigo-700">₹{formatMoney(amounts.total)}</dd>
                            </div>
                            <div className="bg-indigo-50 px-3 py-2.5">
                                <dt className="text-[11px] font-medium text-indigo-700">
                                    {taskCount} task{taskCount === 1 ? '' : 's'} total
                                </dt>
                                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-indigo-800">
                                    ₹{formatMoney(amounts.total * taskCount)}
                                </dd>
                            </div>
                        </dl>
                    )}
                </div>
            </FormSection>

            <FormSection title="Applicable years" description="Create one task per assessment or financial year." icon={FiCalendar} tone="violet">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Toggle
                        checked={form.has_ay === '1'}
                        onChange={(on) => setForm((p) => ({ ...p, has_ay: on ? '1' : '0' }))}
                        label="Assessment year (AY)"
                        description="For income-tax returns and assessments"
                    />
                    <Toggle
                        checked={form.has_fy === '1'}
                        onChange={(on) => setForm((p) => ({ ...p, has_fy: on ? '1' : '0' }))}
                        label="Financial year (FY)"
                        description="For audits, GST annual returns and books"
                    />
                </div>

                {form.has_ay === '1' && (
                    <YearGrid
                        label="Assessment years"
                        years={assessmentYears}
                        selected={form.ay}
                        prefix="AY"
                        onToggle={(y) => toggleYear('ay', y)}
                        onSelectAll={() => setForm((p) => ({ ...p, ay: [...assessmentYears] }))}
                        onClear={() => setForm((p) => ({ ...p, ay: [] }))}
                        hasError={err('ay')}
                        errorMessage={err('ay') ? fieldError.message : undefined}
                        fieldRef={fieldRefs.ay}
                    />
                )}

                {form.has_fy === '1' && (
                    <YearGrid
                        label="Financial years"
                        years={financialYears}
                        selected={form.fy}
                        prefix="FY"
                        onToggle={(y) => toggleYear('fy', y)}
                        onSelectAll={() => setForm((p) => ({ ...p, fy: [...financialYears] }))}
                        onClear={() => setForm((p) => ({ ...p, fy: [] }))}
                        hasError={err('fy')}
                        errorMessage={err('fy') ? fieldError.message : undefined}
                        fieldRef={fieldRefs.fy}
                    />
                )}
            </FormSection>
        </div>
    );
}

function YearGrid({ label, years, selected, prefix, onToggle, onSelectAll, onClear, hasError, errorMessage, fieldRef }) {
    return (
        <div className="mt-4 border-t border-slate-100 pt-4" ref={fieldRef}>
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-slate-700">
                    {label} <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-slate-400">{selected.length} selected</span>
                </p>
                <div className="flex gap-1">
                    <button type="button" onClick={onSelectAll} className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
                        Select all
                    </button>
                    <button type="button" onClick={onClear} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">
                        Clear
                    </button>
                </div>
            </div>
            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 ${hasError ? 'rounded-lg ring-2 ring-red-200' : ''}`}>
                {years.map((year) => {
                    const on = selected.includes(year);
                    return (
                        <button
                            key={year}
                            type="button"
                            onClick={() => onToggle(year)}
                            aria-pressed={on}
                            className={`rounded-lg border px-2 py-2 font-mono text-xs font-medium tabular-nums transition-colors ${
                                on
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                            }`}
                        >
                            {prefix} {year}
                        </button>
                    );
                })}
            </div>
            {hasError && errorMessage && (
                <p className="mt-1.5 text-xs text-red-600" role="alert">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
