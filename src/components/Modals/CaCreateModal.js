import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiImage, FiRefreshCw, FiUserPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import StateDistrictSelect from '../state-district-select';
import { DatePickerField } from '../PortalDatePicker';
import { createCa } from '../../services/caService';
import { uploadOneSaasFileUrl } from '../../utils/onesaas-upload';

const MODAL_BODY_CLASS =
    'px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const INPUT_CLASS =
    'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

const LABEL_CLASS = 'block text-xs font-medium text-slate-700 mb-1';

const GUARDIAN_TYPES = [
    { value: 'S/O', label: 'Son Of' },
    { value: 'D/O', label: 'Daughter Of' },
    { value: 'W/O', label: 'Wife Of' },
    { value: 'C/O', label: 'Care Of' },
];

const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

const INITIAL_FORM = {
    pan: '',
    full_name: '',
    care_of: 'S/O',
    guardian_name: '',
    mobile: '',
    country_code: '91',
    email: '',
    date_of_birth: '',
    gender: 'male',
    imageFile: null,
    imageUrl: '',
    state: '',
    district: '',
    town_or_village: '',
    pincode: '',
    address_line_1: '',
    includeOpeningBalance: false,
    opening_amount: '',
    opening_type: 'credit',
    opening_date: new Date().toISOString().split('T')[0],
};

const uploadProfileImage = async (file) => uploadOneSaasFileUrl(file);

const validateForm = (form) => {
    const errors = {};
    if (!form.full_name.trim()) errors.full_name = 'Full name is required';
    if (!form.care_of) errors.care_of = 'Care of is required';
    if (!form.guardian_name.trim()) errors.guardian_name = 'Guardian name is required';
    if (!/^\d{10}$/.test(String(form.mobile).trim())) errors.mobile = 'Enter a valid 10-digit mobile';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email';
    if (!form.date_of_birth) errors.date_of_birth = 'Date of birth is required';
    if (!form.gender) errors.gender = 'Gender is required';
    if (!form.state) errors.state = 'State is required';
    if (!form.district) errors.district = 'District is required';
    if (!form.town_or_village.trim()) errors.town_or_village = 'Town / village is required';
    if (!/^\d{6}$/.test(String(form.pincode).trim())) errors.pincode = 'Enter a valid 6-digit pincode';
    if (form.pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.pan.trim())) {
        errors.pan = 'Enter a valid PAN';
    }
    if (form.includeOpeningBalance) {
        const amount = Number(form.opening_amount);
        if (!Number.isFinite(amount) || amount < 0) errors.opening_amount = 'Enter a valid amount';
        if (!form.opening_date) errors.opening_date = 'Opening balance date is required';
    }
    return errors;
};

export default function CaCreateModal({ isOpen, onClose, onSuccess }) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const resetForm = () => {
        setForm(INITIAL_FORM);
        setErrors({});
        setFormError('');
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (submitting) return;
        resetForm();
        onClose?.();
    };

    const setField = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
        setFormError('');
    };

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setField('imageFile', file);
        setField('imageUrl', '');
        setImagePreview(URL.createObjectURL(file));
        setFormError('');
        try {
            const url = await uploadProfileImage(file);
            setField('imageUrl', url);
        } catch (uploadErr) {
            setField('imageFile', null);
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setFormError(uploadErr.message || 'Failed to upload image');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validation = validateForm(form);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            setFormError('Please fix the highlighted fields.');
            return;
        }

        setSubmitting(true);
        setFormError('');
        try {
            const imageUrl = form.imageUrl || null;

            const payload = {
                profile: {
                    full_name: form.full_name.trim(),
                    care_of: form.care_of,
                    guardian_name: form.guardian_name.trim(),
                    mobile: String(form.mobile).trim(),
                    country_code: String(form.country_code || '91').replace(/^\+/, ''),
                    email: form.email.trim(),
                    date_of_birth: form.date_of_birth,
                    gender: form.gender,
                    ...(form.pan.trim() ? { pan: form.pan.trim().toUpperCase() } : {}),
                    ...(imageUrl ? { image: imageUrl } : {}),
                },
                address: {
                    state: form.state,
                    district: form.district,
                    town_or_village: form.town_or_village.trim(),
                    pincode: String(form.pincode).trim(),
                    ...(form.address_line_1.trim()
                        ? { address_line_1: form.address_line_1.trim() }
                        : {}),
                },
            };

            if (form.includeOpeningBalance && form.opening_amount !== '') {
                payload.opening_balance = {
                    amount: parseFloat(form.opening_amount),
                    type: form.opening_type || 'credit',
                    date: form.opening_date,
                };
            }

            const result = await createCa(payload);
            if (!result?.success) {
                throw new Error(result?.message || 'Failed to create CA');
            }

            toast.success(result.message || 'CA created successfully');
            resetForm();
            onSuccess?.(result.data);
            onClose?.();
        } catch (err) {
            console.error('CA create:', err);
            const status = err.response?.status;
            const message = err.response?.data?.message || err.message || 'Failed to create CA';
            if (status === 409) {
                setFormError(message || 'A CA with this mobile, email, or PAN already exists in this branch.');
            } else if (status === 400) {
                setFormError(message);
            } else {
                setFormError(message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10050] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                    onClick={handleClose}
                />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-[1] pointer-events-auto bg-white rounded-xl shadow-xl w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col border border-slate-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3.5 border-b border-indigo-500/20 bg-indigo-600 text-white">
                        <div className="flex items-center gap-2 min-w-0">
                            <FiUserPlus className="w-4 h-4 shrink-0 opacity-90" />
                            <div>
                                <h3 className="text-sm font-semibold">Create CA</h3>
                                <p className="text-[11px] text-indigo-100 mt-0.5">
                                    Add a chartered accountant to this branch
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="p-1.5 rounded-md hover:bg-white/15 disabled:opacity-50"
                            aria-label="Close"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                        <div className={`${MODAL_BODY_CLASS} space-y-5`}>
                            {formError && (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                                    {formError}
                                </div>
                            )}

                            <section className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Personal details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className={LABEL_CLASS}>
                                            Full name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.full_name}
                                            onChange={(e) => setField('full_name', e.target.value)}
                                            className={`${INPUT_CLASS} ${errors.full_name ? 'border-rose-300' : ''}`}
                                            placeholder="CA full name"
                                        />
                                        {errors.full_name && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.full_name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Care of <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={form.care_of}
                                            onChange={(e) => setField('care_of', e.target.value)}
                                            className={INPUT_CLASS}
                                        >
                                            {GUARDIAN_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Guardian name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.guardian_name}
                                            onChange={(e) => setField('guardian_name', e.target.value)}
                                            className={`${INPUT_CLASS} ${errors.guardian_name ? 'border-rose-300' : ''}`}
                                            placeholder="Guardian name"
                                        />
                                        {errors.guardian_name && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.guardian_name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Mobile <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={form.mobile}
                                            onChange={(e) =>
                                                setField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))
                                            }
                                            className={`${INPUT_CLASS} ${errors.mobile ? 'border-rose-300' : ''}`}
                                            placeholder="10-digit mobile"
                                        />
                                        {errors.mobile && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.mobile}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Country code</label>
                                        <input
                                            type="text"
                                            value={form.country_code}
                                            onChange={(e) => setField('country_code', e.target.value.replace(/\D/g, ''))}
                                            className={INPUT_CLASS}
                                            placeholder="91"
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Email <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setField('email', e.target.value)}
                                            className={`${INPUT_CLASS} ${errors.email ? 'border-rose-300' : ''}`}
                                            placeholder="email@example.com"
                                        />
                                        {errors.email && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Date of birth <span className="text-rose-500">*</span>
                                        </label>
                                        <DatePickerField
                                            value={form.date_of_birth}
                                            onChange={(val) =>
                                                setField('date_of_birth', typeof val === 'string' ? val : '')
                                            }
                                            placeholder="Select date"
                                            mode="single"
                                            initialTab="single"
                                            wrapperClassName="w-full block"
                                            buttonClassName={INPUT_CLASS}
                                        />
                                        {errors.date_of_birth && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.date_of_birth}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Gender <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={form.gender}
                                            onChange={(e) => setField('gender', e.target.value)}
                                            className={INPUT_CLASS}
                                        >
                                            {GENDERS.map((g) => (
                                                <option key={g.value} value={g.value}>
                                                    {g.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>PAN (optional)</label>
                                        <input
                                            type="text"
                                            value={form.pan}
                                            onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                                            className={`${INPUT_CLASS} uppercase ${errors.pan ? 'border-rose-300' : ''}`}
                                            placeholder="ABCDE1234F"
                                            maxLength={10}
                                        />
                                        {errors.pan && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.pan}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Profile photo (optional)</label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                                            >
                                                <FiImage className="w-4 h-4" />
                                                Choose image
                                            </button>
                                            {imagePreview && (
                                                <img
                                                    src={imagePreview}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                />
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Address
                                </h4>
                                <StateDistrictSelect
                                    selectedState={form.state}
                                    selectedDistrict={form.district}
                                    onStateChange={(value) => {
                                        setField('state', value);
                                        setField('district', '');
                                    }}
                                    onDistrictChange={(value) => setField('district', value)}
                                    selectClassName={INPUT_CLASS}
                                />
                                {(errors.state || errors.district) && (
                                    <p className="text-xs text-rose-600">
                                        {errors.state || errors.district}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Town / village <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.town_or_village}
                                            onChange={(e) => setField('town_or_village', e.target.value)}
                                            className={`${INPUT_CLASS} ${errors.town_or_village ? 'border-rose-300' : ''}`}
                                        />
                                        {errors.town_or_village && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.town_or_village}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Pincode <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.pincode}
                                            onChange={(e) =>
                                                setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
                                            }
                                            className={`${INPUT_CLASS} ${errors.pincode ? 'border-rose-300' : ''}`}
                                            placeholder="6-digit pincode"
                                        />
                                        {errors.pincode && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.pincode}</p>
                                        )}
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={LABEL_CLASS}>Address line (optional)</label>
                                        <input
                                            type="text"
                                            value={form.address_line_1}
                                            onChange={(e) => setField('address_line_1', e.target.value)}
                                            className={INPUT_CLASS}
                                            placeholder="Flat, building, street"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-3 rounded-lg border border-slate-200 p-4 bg-slate-50/80">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.includeOpeningBalance}
                                        onChange={(e) => setField('includeOpeningBalance', e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-slate-800">
                                        Set opening balance (optional)
                                    </span>
                                </label>
                                {form.includeOpeningBalance && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                        <div>
                                            <label className={LABEL_CLASS}>Amount</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={form.opening_amount}
                                                onChange={(e) => setField('opening_amount', e.target.value)}
                                                className={`${INPUT_CLASS} ${errors.opening_amount ? 'border-rose-300' : ''}`}
                                                placeholder="0.00"
                                            />
                                            {errors.opening_amount && (
                                                <p className="text-xs text-rose-600 mt-1">{errors.opening_amount}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className={LABEL_CLASS}>Type</label>
                                            <select
                                                value={form.opening_type}
                                                onChange={(e) => setField('opening_type', e.target.value)}
                                                className={INPUT_CLASS}
                                            >
                                                <option value="credit">Credit</option>
                                                <option value="debit">Debit</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={LABEL_CLASS}>Date</label>
                                            <DatePickerField
                                                value={form.opening_date}
                                                onChange={(val) =>
                                                    setField('opening_date', typeof val === 'string' ? val : '')
                                                }
                                                placeholder="Select date"
                                                mode="single"
                                                initialTab="single"
                                                wrapperClassName="w-full block"
                                                buttonClassName={INPUT_CLASS}
                                            />
                                            {errors.opening_date && (
                                                <p className="text-xs text-rose-600 mt-1">{errors.opening_date}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        <div className="shrink-0 flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {submitting ? (
                                    <>
                                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                                        Creating…
                                    </>
                                ) : (
                                    'Create CA'
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
