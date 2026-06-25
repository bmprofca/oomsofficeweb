import React, { useMemo } from 'react';
import { DatePickerField } from '../../../components/PortalDatePicker';
import SearchablePickField from '../SearchablePickField';
import {
    formatMoney,
    getServiceAmounts,
    parseAmount,
    sanitizeFeesInput,
} from '../taskCreateConstants';

const DATE_BTN_CLASS =
    'w-full min-h-[42px] pl-3 pr-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none';

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

    const amounts = useMemo(
        () => serviceFeeSummary(selectedService, form.fees),
        [selectedService, form.fees]
    );

    return (
        <div className="space-y-4">
            <SearchablePickField
                label={
                    <span>
                        Service <span className="text-red-500">*</span>
                    </span>
                }
                locked={serviceLocked}
                selected={selectedService}
                onClear={() => {
                    if (serviceLocked) return;
                    setSelectedService(null);
                    setForm((p) => ({ ...p, service_id: '', fees: '' }));
                }}
                onSelect={(item) => {
                    if (serviceLocked) return;
                    setSelectedService({
                        service_id: item.service_id,
                        name: item.name,
                        displayName: item.name,
                        fees: item.fees,
                        gst_rate: item.gst_rate,
                        gst_value: item.gst_value,
                    });
                    setForm((p) => ({
                        ...p,
                        service_id: item.service_id,
                        fees: item.fees != null ? sanitizeFeesInput(String(item.fees)) : p.fees,
                    }));
                }}
                listEndpoint="service/list"
                endpoint="service/list"
                valueKey="service_id"
                labelMapping={{
                    primary: (s) => s.name,
                    secondary: (s) => {
                        const { fees, gstRate, gstValue, total } = getServiceAmounts(s);
                        const gstPart =
                            gstValue > 0
                                ? ` · GST ${gstRate}% ₹${formatMoney(gstValue)}`
                                : '';
                        return `₹${formatMoney(fees)}${gstPart} · Total ₹${formatMoney(total)}`;
                    },
                }}
                dataExtractor={(res) => (Array.isArray(res?.data) ? res.data : [])}
                placeholder="Search and select service..."
                renderSelected={(s) => s.displayName || s.name}
                hasError={err('service')}
                fieldRef={fieldRefs.service}
                errorMessage={err('service') ? fieldError.message : undefined}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5" ref={fieldRefs.fees}>
                    <label className="block text-sm font-medium text-gray-700">
                        Fees (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={form.fees}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, fees: sanitizeFeesInput(e.target.value) }))
                            }
                            onBlur={() => {
                                const str = String(form.fees || '').trim();
                                if (str && /^\d+(\.\d+)?$/.test(str)) {
                                    setForm((p) => ({ ...p, fees: parseAmount(str).toFixed(2) }));
                                }
                            }}
                            className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none ${
                                err('fees') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                            }`}
                            placeholder="0.00"
                        />
                    </div>
                    {err('fees') && (
                        <p className="text-xs text-red-600" role="alert">
                            {fieldError.message}
                        </p>
                    )}
                </div>
                <div className="space-y-1.5" ref={fieldRefs.due_date}>
                    <label className="block text-sm font-medium text-gray-700">
                        Due Date <span className="text-red-500">*</span>
                    </label>
                    <DatePickerField
                        value={form.due_date}
                        onChange={(val) =>
                            setForm((p) => ({
                                ...p,
                                due_date: typeof val === 'string' ? val : '',
                            }))
                        }
                        placeholder="Select due date"
                        mode="single"
                        initialTab="single"
                        quickOptionKeys={['td', 'tom', 'n7', 'eom']}
                        wrapperClassName="w-full block"
                        buttonClassName={`${DATE_BTN_CLASS} ${
                            err('due_date') ? 'border-red-500 ring-1 ring-red-500' : ''
                        }`}
                    />
                    {err('due_date') && (
                        <p className="text-xs text-red-600" role="alert">
                            {fieldError.message}
                        </p>
                    )}
                </div>
            </div>

            {form.fees && parseAmount(form.fees) >= 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                            Fees: <span className="font-medium">₹{formatMoney(amounts.fees)}</span>
                        </span>
                        {amounts.gstValue > 0 && (
                            <span>
                                GST ({amounts.gstRate}%):{' '}
                                <span className="font-medium">₹{formatMoney(amounts.gstValue)}</span>
                            </span>
                        )}
                        <span>
                            Total per task:{' '}
                            <span className="font-medium text-indigo-700">₹{formatMoney(amounts.total)}</span>
                        </span>
                    </div>
                    {taskCount > 1 && (
                        <p className="mt-2 pt-2 border-t border-slate-200 text-slate-800">
                            Total for {taskCount} tasks:{' '}
                            <span className="font-semibold text-indigo-700">
                                ₹{formatMoney(amounts.total * taskCount)}
                            </span>
                        </p>
                    )}
                </div>
            )}

            <div className="rounded-lg border border-gray-100 bg-white p-3 space-y-2.5">
                <p className="text-sm font-medium text-gray-800">Applicable for</p>
                <div className="flex flex-wrap gap-6">
                    {[
                        { key: 'has_ay', label: 'Assessment Year (AY)' },
                        { key: 'has_fy', label: 'Financial Year (FY)' },
                    ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2.5">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={form[key] === '1'}
                                onClick={() =>
                                    setForm((p) => ({ ...p, [key]: p[key] === '1' ? '0' : '1' }))
                                }
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                    form[key] === '1' ? 'bg-indigo-600' : 'bg-gray-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                        form[key] === '1' ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                />
                            </button>
                            <span className="text-sm text-gray-700">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {form.has_ay === '1' && (
                <YearGrid
                    label="Assessment Years (AY)"
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
                    label="Financial Years (FY)"
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
        </div>
    );
}

function YearGrid({ label, years, selected, prefix, onToggle, onSelectAll, onClear, hasError, errorMessage, fieldRef }) {
    return (
        <div className="space-y-2" ref={fieldRef}>
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                    {label} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onSelectAll}
                        className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        Select All
                    </button>
                    <button
                        type="button"
                        onClick={onClear}
                        className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Clear All
                    </button>
                </div>
            </div>
            <div
                className={`bg-gray-50 border rounded-lg p-3 grid grid-cols-3 lg:grid-cols-6 gap-2 ${
                    hasError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                }`}
            >
                {years.map((year) => (
                    <button
                        key={year}
                        type="button"
                        onClick={() => onToggle(year)}
                        className={`py-2 px-2 text-sm rounded-md border transition-colors ${
                            selected.includes(year)
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                    >
                        {prefix} {year}
                    </button>
                ))}
            </div>
            {hasError && errorMessage && (
                <p className="text-xs text-red-600" role="alert">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
