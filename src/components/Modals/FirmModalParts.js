import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    FiX,
    FiBriefcase,
    FiMapPin,
    FiFileText,
    FiUser,
    FiClock,
} from 'react-icons/fi';
import CustomSelect from '../CustomSelect';
import { optionByValue } from '../../utils/customSelectHelpers';

const SCROLL_BODY =
    'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const INPUT_CLS =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400';

const LABEL_CLS = 'mb-1.5 block text-sm font-semibold text-slate-700';

const DEFAULT_BUSINESS_TYPES = [
    { value: 'individual', label: 'Individual' },
    { value: 'partnership firm', label: 'Partnership Firm' },
    { value: 'limited liability partnership', label: 'Limited Liability Partnership (LLP)' },
    { value: 'one person company', label: 'One Person Company (OPC)' },
    { value: 'private limited company', label: 'Private Limited Company' },
    { value: 'public limited company', label: 'Public Limited Company' },
    { value: 'section 8 company', label: 'Section 8 Company' },
    { value: 'hindu undivided family', label: 'Hindu Undivided Family (HUF)' },
    { value: 'trust', label: 'Trust' },
    { value: 'society', label: 'Society' },
    { value: 'cooperative society', label: 'Cooperative Society' },
    { value: 'producer company', label: 'Producer Company' },
    { value: 'government department', label: 'Government Department' },
    { value: 'public sector undertaking', label: 'Public Sector Undertaking (PSU)' },
    { value: 'statutory corporation', label: 'Statutory Corporation' },
    { value: 'local authority', label: 'Local Authority' },
    { value: 'foreign company', label: 'Foreign Company' },
    { value: 'branch office', label: 'Branch Office' },
    { value: 'liaison office', label: 'Liaison Office' },
    { value: 'joint venture', label: 'Joint Venture (JV)' },
    { value: 'artificial judicial person', label: 'Artificial Judicial Person' },
    { value: 'other', label: 'Other' },
];

/** Viewport-safe modal shell — see context/modal.md */
export function FirmModalShell({
    open,
    onClose,
    maxWidth = 'max-w-5xl',
    headerClass = 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800',
    icon: Icon = FiBriefcase,
    title,
    subtitle,
    footer,
    children,
    zClass = 'z-[100]',
}) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    key="firm-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`fixed inset-0 ${zClass} flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none`}
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                        aria-label="Close dialog"
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="firm-modal-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`relative z-[1] pointer-events-auto flex w-full ${maxWidth} my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/80`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className={`shrink-0 ${headerClass} px-5 py-3.5`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner">
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 id="firm-modal-title" className="truncate text-lg font-bold text-white sm:text-xl">{title}</h2>
                                        {subtitle && <p className="mt-0.5 truncate text-sm text-white/80">{subtitle}</p>}
                                    </div>
                                </div>
                                <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15" aria-label="Close">
                                    <FiX className="h-5 w-5" />
                                </button>
                            </div>
                        </header>
                        <div className={SCROLL_BODY} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>{children}</div>
                        {footer && <footer className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-5 py-3">{footer}</footer>}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

export function ModalSection({ icon: Icon, title, children, className = '' }) {
    return (
        <section className={`rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 ${className}`}>
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-3">
                {Icon && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <Icon className="h-4 w-4" />
                    </span>
                )}
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">{title}</h3>
            </div>
            {children}
        </section>
    );
}

function FormField({ label, required, children }) {
    return (
        <div>
            <label className={LABEL_CLS}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            {children}
        </div>
    );
}

export function FormInput({ label, required, ...props }) {
    return (
        <FormField label={label} required={required}>
            <input className={INPUT_CLS} {...props} />
        </FormField>
    );
}

export function FormSelect({
    label,
    required,
    options = [],
    placeholder = 'Select...',
    value = '',
    onChange,
    disabled = false,
    isClearable = false,
}) {
    const normalizedOptions = useMemo(
        () =>
            (options || []).map((opt) =>
                typeof opt === 'string' ? { value: opt, label: opt } : opt
            ),
        [options]
    );

    return (
        <FormField label={label} required={required}>
            <CustomSelect
                options={normalizedOptions}
                value={optionByValue(normalizedOptions, value)}
                onChange={(opt) => {
                    if (typeof onChange === 'function') {
                        onChange({ target: { value: opt?.value || '' } });
                    }
                }}
                placeholder={placeholder}
                searchPlaceholder="Search..."
                isDisabled={disabled}
                isClearable={isClearable}
            />
        </FormField>
    );
}

export function FirmFormFields({
    formData,
    setFormData,
    stateOptions,
    districtOptions,
    statesLoading,
    businessTypeOptions = DEFAULT_BUSINESS_TYPES,
}) {
    const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

    return (
        <div className="space-y-5">
            <ModalSection icon={FiBriefcase} title="Basic information">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormInput
                        label="Firm name"
                        required
                        value={formData.name}
                        onChange={(e) => update('name', e.target.value)}
                        placeholder="Enter firm name"
                    />
                    <FormSelect
                        label="Business type"
                        required
                        value={formData.type}
                        onChange={(e) => update('type', e.target.value)}
                        options={businessTypeOptions}
                    />
                </div>
            </ModalSection>

            <ModalSection icon={FiFileText} title="Registration & tax">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormInput
                        label="PAN"
                        required
                        value={formData.pan}
                        onChange={(e) => update('pan', e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                    />
                    <FormInput
                        label="GST"
                        value={formData.gst}
                        onChange={(e) => update('gst', e.target.value)}
                        placeholder="GSTIN"
                    />
                    <FormInput
                        label="File number"
                        value={formData.file_no}
                        onChange={(e) => update('file_no', e.target.value)}
                        placeholder="File no."
                    />
                    <FormInput
                        label="TAN"
                        value={formData.tan}
                        onChange={(e) => update('tan', e.target.value)}
                        placeholder="TAN"
                    />
                    <FormInput
                        label="VAT"
                        value={formData.vat}
                        onChange={(e) => update('vat', e.target.value)}
                        placeholder="VAT"
                    />
                    <FormInput
                        label="CIN"
                        value={formData.cin}
                        onChange={(e) => update('cin', e.target.value)}
                        placeholder="CIN"
                    />
                </div>
            </ModalSection>

            <ModalSection icon={FiMapPin} title="Address">
                <div className="space-y-4">
                    <FormInput
                        label="Address line 1"
                        value={formData.address_line_1}
                        onChange={(e) => update('address_line_1', e.target.value)}
                        placeholder="Street, building, area"
                    />
                    <FormInput
                        label="Address line 2"
                        value={formData.address_line_2}
                        onChange={(e) => update('address_line_2', e.target.value)}
                        placeholder="Landmark (optional)"
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <FormSelect
                            label="State"
                            value={formData.state}
                            onChange={(e) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    state: e.target.value,
                                    city: '',
                                }));
                            }}
                            placeholder={statesLoading ? 'Loading states…' : 'Select state'}
                            disabled={statesLoading}
                            options={stateOptions}
                        />
                        <FormSelect
                            label="District"
                            value={formData.city}
                            onChange={(e) => update('city', e.target.value)}
                            placeholder={
                                !formData.state
                                    ? 'Select state first'
                                    : statesLoading
                                        ? 'Loading…'
                                        : 'Select district'
                            }
                            disabled={!formData.state || statesLoading}
                            options={districtOptions}
                        />
                        <FormInput
                            label="Pincode"
                            value={formData.pincode}
                            onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit pincode"
                            inputMode="numeric"
                        />
                    </div>
                </div>
            </ModalSection>
        </div>
    );
}

function DetailItem({ label, value, mono }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-sm font-semibold text-slate-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>
                {value ?? '—'}
            </p>
        </div>
    );
}

export function FirmViewDetails({ firm, formatDate }) {
    const addr = firm.address || {};
    const district = addr.district || addr.city || '—';

    return (
        <div className="space-y-5">
            <ModalSection icon={FiBriefcase} title="Overview">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="Firm name" value={firm.firm_name} />
                    <DetailItem label="Business type" value={firm.firm_type?.replace(/_/g, ' ')} />
                    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                        <span
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${firm.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}
                        >
                            {firm.status ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <DetailItem label="Firm ID" value={firm.firm_id} mono />
                    <DetailItem label="Client username" value={firm.username} mono />
                </div>
            </ModalSection>

            <ModalSection icon={FiFileText} title="Registration & tax">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="PAN" value={firm.pan} mono />
                    <DetailItem label="GST" value={firm.gst} mono />
                    <DetailItem label="TAN" value={firm.tan} mono />
                    <DetailItem label="CIN" value={firm.cin} mono />
                    <DetailItem label="VAT" value={firm.vat} mono />
                    <DetailItem label="File number" value={firm.file_no} />
                </div>
            </ModalSection>

            <ModalSection icon={FiMapPin} title="Address">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem label="Address line 1" value={addr.address_line_1} />
                    <DetailItem label="Address line 2" value={addr.address_line_2} />
                    <DetailItem label="District" value={district} />
                    <DetailItem label="State" value={addr.state} />
                    <DetailItem label="Pincode" value={addr.pincode} />
                    <DetailItem label="Country" value={addr.country || 'India'} />
                </div>
            </ModalSection>

            {(firm.create_by?.name || firm.modify_by?.name) && (
                <ModalSection icon={FiUser} title="Audit">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {firm.create_by?.name && <DetailItem label="Created by" value={firm.create_by.name} />}
                        {firm.modify_by?.name && <DetailItem label="Last modified by" value={firm.modify_by.name} />}
                    </div>
                </ModalSection>
            )}

            <ModalSection icon={FiClock} title="Timeline">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem label="Created" value={formatDate(firm.create_date)} />
                    <DetailItem label="Last updated" value={formatDate(firm.modify_date)} />
                </div>
            </ModalSection>
        </div>
    );
}

export function ModalFooterActions({
    onCancel,
    onConfirm,
    cancelLabel = 'Cancel',
    confirmLabel,
    confirmClass = 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200',
    loading,
    disabled,
}) {
    return (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
                {cancelLabel}
            </button>
            <button
                type="button"
                onClick={onConfirm}
                disabled={loading || disabled}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
            >
                {loading ? 'Please wait…' : confirmLabel}
            </button>
        </div>
    );
}
