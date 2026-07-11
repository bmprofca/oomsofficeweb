import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiImage, FiRefreshCw, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { createBranch } from '../../services/branchSetupService';
import { uploadOneSaasFileUrl } from '../../utils/onesaas-upload';

const EMPTY_FORM = {
    name: '',
    legal_name: '',
    pan: '',
    gst: '',
    mobile_1: '',
    mobile_2: '',
    email_1: '',
    email_2: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
    invoice_address: '',
};

const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10';

const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

function Field({ label, required, children }) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required ? ' *' : ''}
            </label>
            {children}
        </div>
    );
}

export default function CreateBranch({ isOpen, onClose, onSuccess }) {
    const [mounted, setMounted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);

    const [logoFile, setLogoFile] = useState(null);
    const [signFile, setSignFile] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [signUrl, setSignUrl] = useState('');
    const [logoPreview, setLogoPreview] = useState('');
    const [signPreview, setSignPreview] = useState('');
    const [logoUploading, setLogoUploading] = useState(false);
    const [signUploading, setSignUploading] = useState(false);

    const logoInputRef = useRef(null);
    const signInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) setMounted(true);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && !submitting) onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose, submitting]);

    useEffect(() => {
        return () => {
            if (logoPreview) URL.revokeObjectURL(logoPreview);
            if (signPreview) URL.revokeObjectURL(signPreview);
        };
    }, [logoPreview, signPreview]);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setError('');
        setLogoFile(null);
        setSignFile(null);
        setLogoUrl('');
        setSignUrl('');
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        if (signPreview) URL.revokeObjectURL(signPreview);
        setLogoPreview('');
        setSignPreview('');
        if (logoInputRef.current) logoInputRef.current.value = '';
        if (signInputRef.current) signInputRef.current.value = '';
    };

    const handleClose = () => {
        if (submitting) return;
        resetForm();
        onClose?.();
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = async (event, type) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type?.startsWith('image/')) {
            toast.error('Please select a valid image file');
            event.target.value = '';
            return;
        }

        const preview = URL.createObjectURL(file);
        const setUploading = type === 'logo' ? setLogoUploading : setSignUploading;
        const setFile = type === 'logo' ? setLogoFile : setSignFile;
        const setPreview = type === 'logo' ? setLogoPreview : setSignPreview;
        const setUrl = type === 'logo' ? setLogoUrl : setSignUrl;
        const prevPreview = type === 'logo' ? logoPreview : signPreview;

        if (prevPreview) URL.revokeObjectURL(prevPreview);
        setFile(file);
        setPreview(preview);
        setUrl('');
        setUploading(true);

        try {
            const uploadedUrl = await uploadOneSaasFileUrl(file);
            setUrl(uploadedUrl);
        } catch (err) {
            setFile(null);
            setPreview('');
            URL.revokeObjectURL(preview);
            if (type === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
            if (type === 'sign' && signInputRef.current) signInputRef.current.value = '';
            toast.error(err.message || `Failed to upload ${type}`);
        } finally {
            setUploading(false);
        }
    };

    const validate = () => {
        if (!form.name.trim()) return 'Branch name is required';
        if (!form.legal_name.trim()) return 'Legal name is required';
        if (form.email_1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_1.trim())) {
            return 'Invalid primary email format';
        }
        if (form.email_2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_2.trim())) {
            return 'Invalid secondary email format';
        }
        if (logoFile && !logoUrl) return 'Logo is still uploading';
        if (signFile && !signUrl) return 'Signature is still uploading';
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const branch = await createBranch({
                name: form.name.trim(),
                legal_name: form.legal_name.trim(),
                logo: logoUrl || null,
                sign: signUrl || null,
                pan: form.pan.trim() || null,
                gst: form.gst.trim() || null,
                mobile_1: form.mobile_1.trim() || null,
                mobile_2: form.mobile_2.trim() || null,
                email_1: form.email_1.trim() || null,
                email_2: form.email_2.trim() || null,
                address_line_1: form.address_line_1.trim() || null,
                address_line_2: form.address_line_2.trim() || null,
                city: form.city.trim() || null,
                state: form.state.trim() || null,
                pincode: form.pincode.trim() || null,
                invoice_address: form.invoice_address.trim() || null,
            });

            resetForm();
            onSuccess?.(branch);
            onClose?.();
        } catch (err) {
            setError(err.message || 'Failed to create branch');
        } finally {
            setSubmitting(false);
        }
    };

    if (!mounted && !isOpen) return null;

    return createPortal(
        isOpen ? (
            <div className="fixed inset-0 z-[220] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                    onClick={handleClose}
                    aria-hidden
                />
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-branch-modal-title"
                    className="relative z-[1] pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex items-center justify-between gap-3">
                        <div>
                            <h2 id="create-branch-modal-title" className="text-sm font-semibold text-gray-900">
                                Create Branch
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Only branch name and legal name are required.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            aria-label="Close"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        <div
                            className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {error && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-5">
                                <section>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                                        Basic details
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Field label="Branch name" required>
                                            <input
                                                name="name"
                                                value={form.name}
                                                onChange={handleChange}
                                                className={inputClass}
                                                placeholder="Display name"
                                            />
                                        </Field>
                                        <Field label="Legal name" required>
                                            <input
                                                name="legal_name"
                                                value={form.legal_name}
                                                onChange={handleChange}
                                                className={inputClass}
                                                placeholder="Registered legal name"
                                            />
                                        </Field>
                                    </div>
                                </section>

                                <section>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                                        Branding
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Field label="Logo">
                                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        {logoPreview ? (
                                                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <FiImage className="text-slate-400" size={18} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            ref={logoInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleImageSelect(e, 'logo')}
                                                            className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-indigo-700"
                                                        />
                                                        {logoUploading && (
                                                            <p className="mt-1 text-[11px] text-indigo-600 flex items-center gap-1">
                                                                <FiRefreshCw className="animate-spin" size={11} />
                                                                Uploading logo...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Field>
                                        <Field label="Signature">
                                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        {signPreview ? (
                                                            <img src={signPreview} alt="Signature preview" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <FiImage className="text-slate-400" size={18} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            ref={signInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleImageSelect(e, 'sign')}
                                                            className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-indigo-700"
                                                        />
                                                        {signUploading && (
                                                            <p className="mt-1 text-[11px] text-indigo-600 flex items-center gap-1">
                                                                <FiRefreshCw className="animate-spin" size={11} />
                                                                Uploading signature...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Field>
                                    </div>
                                </section>

                                <section>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                                        Tax & contact
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Field label="PAN">
                                            <input name="pan" value={form.pan} onChange={handleChange} className={inputClass} placeholder="PAN number" />
                                        </Field>
                                        <Field label="GST">
                                            <input name="gst" value={form.gst} onChange={handleChange} className={inputClass} placeholder="GST number" />
                                        </Field>
                                        <Field label="Mobile 1">
                                            <input name="mobile_1" value={form.mobile_1} onChange={handleChange} className={inputClass} placeholder="Primary mobile" />
                                        </Field>
                                        <Field label="Mobile 2">
                                            <input name="mobile_2" value={form.mobile_2} onChange={handleChange} className={inputClass} placeholder="Secondary mobile" />
                                        </Field>
                                        <Field label="Email 1">
                                            <input name="email_1" type="email" value={form.email_1} onChange={handleChange} className={inputClass} placeholder="Primary email" />
                                        </Field>
                                        <Field label="Email 2">
                                            <input name="email_2" type="email" value={form.email_2} onChange={handleChange} className={inputClass} placeholder="Secondary email" />
                                        </Field>
                                    </div>
                                </section>

                                <section>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                                        Address
                                    </p>
                                    <div className="space-y-3">
                                        <Field label="Address line 1">
                                            <input name="address_line_1" value={form.address_line_1} onChange={handleChange} className={inputClass} placeholder="Street address" />
                                        </Field>
                                        <Field label="Address line 2">
                                            <input name="address_line_2" value={form.address_line_2} onChange={handleChange} className={inputClass} placeholder="Area, landmark" />
                                        </Field>
                                        <div className="grid sm:grid-cols-3 gap-3">
                                            <Field label="City">
                                                <input name="city" value={form.city} onChange={handleChange} className={inputClass} placeholder="City" />
                                            </Field>
                                            <Field label="State">
                                                <input name="state" value={form.state} onChange={handleChange} className={inputClass} placeholder="State" />
                                            </Field>
                                            <Field label="Pincode">
                                                <input name="pincode" value={form.pincode} onChange={handleChange} className={inputClass} placeholder="Pincode" />
                                            </Field>
                                        </div>
                                        <Field label="Invoice address">
                                            <textarea
                                                name="invoice_address"
                                                value={form.invoice_address}
                                                onChange={handleChange}
                                                rows={3}
                                                className={`${inputClass} resize-y min-h-[80px]`}
                                                placeholder="Billing / invoice address"
                                            />
                                        </Field>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={submitting}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || logoUploading || signUploading}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {submitting && <FiRefreshCw className="animate-spin" size={13} />}
                                Create branch
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        ) : null,
        document.body
    );
}
