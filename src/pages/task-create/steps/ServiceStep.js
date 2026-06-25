import React from 'react';
import { DatePickerField } from '../../../components/PortalDatePicker';
import SearchablePickField from '../SearchablePickField';

const DATE_BTN_CLASS =
    'w-full min-h-[48px] pl-3 pr-3 py-3 text-sm text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none';

export default function ServiceStep({
    form,
    setForm,
    selectedService,
    setSelectedService,
    assessmentYears,
    financialYears,
    toggleYear,
}) {
    return (
        <div className="space-y-5">
            <SearchablePickField
                label={
                    <span>
                        Service <span className="text-red-500">*</span>
                    </span>
                }
                selected={selectedService}
                onClear={() => {
                    setSelectedService(null);
                    setForm((p) => ({ ...p, service_id: '', fees: '' }));
                }}
                onSelect={(item) => {
                    setSelectedService({
                        service_id: item.service_id,
                        name: `${item.name} - ₹${item.fees}`,
                    });
                    setForm((p) => ({
                        ...p,
                        service_id: item.service_id,
                        fees: item.fees != null ? String(item.fees) : p.fees,
                    }));
                }}
                listEndpoint="service/list"
                endpoint="service/list"
                valueKey="service_id"
                labelMapping={{
                    primary: (s) => s.name,
                    secondary: (s) => `₹${s.fees ?? 0}`,
                }}
                dataExtractor={(res) => (Array.isArray(res?.data) ? res.data : [])}
                placeholder="Search and select service..."
                renderSelected={(s) => s.name}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Fees (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base font-medium">₹</span>
                        <input
                            type="number"
                            value={form.fees}
                            onChange={(e) => setForm((p) => ({ ...p, fees: e.target.value }))}
                            className="w-full pl-12 pr-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none"
                            placeholder="Enter amount"
                        />
                    </div>
                </div>
                <div className="space-y-2">
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
                        buttonClassName={DATE_BTN_CLASS}
                    />
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Applicable for</p>
                <div className="flex flex-wrap gap-6">
                    {[
                        { key: 'has_ay', label: 'Assessment Year (AY)' },
                        { key: 'has_fy', label: 'Financial Year (FY)' },
                    ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-3">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={form[key] === '1'}
                                onClick={() =>
                                    setForm((p) => ({ ...p, [key]: p[key] === '1' ? '0' : '1' }))
                                }
                                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                    form[key] === '1' ? 'bg-indigo-600' : 'bg-gray-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                                        form[key] === '1' ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                />
                            </button>
                            <span className="text-sm font-medium text-gray-900">{label}</span>
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
                />
            )}
        </div>
    );
}

function YearGrid({ label, years, selected, prefix, onToggle, onSelectAll, onClear }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                    {label} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                    <button type="button" onClick={onSelectAll} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg">
                        Select All
                    </button>
                    <button type="button" onClick={onClear} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg">
                        Clear All
                    </button>
                </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-3 lg:grid-cols-6 gap-2">
                {years.map((year) => (
                    <button
                        key={year}
                        type="button"
                        onClick={() => onToggle(year)}
                        className={`p-3 text-sm font-medium rounded-lg border transition-all ${
                            selected.includes(year)
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                    >
                        {prefix} {year}
                    </button>
                ))}
            </div>
        </div>
    );
}
