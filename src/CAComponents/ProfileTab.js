import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { uploadOneSaasFileUrl } from '../utils/onesaas-upload';
import {
    FiCalendar,
    FiCheck,
    FiCheckSquare,
    FiCreditCard,
    FiEdit,
    FiGlobe,
    FiHome,
    FiLoader,
    FiMail,
    FiMapPin,
    FiNavigation,
    FiPhone,
    FiSave,
    FiUpload,
    FiUser,
    FiUserCheck,
    FiX,
} from 'react-icons/fi';
import API_BASE_URL from '../utils/api-controller';
import getHeaders from '../utils/get-headers';
import { editCaProfile } from '../services/caService';

const personalFields = [
    { label: 'Full Name', key: 'name', type: 'text', icon: FiUser },
    { label: 'Care Of', key: 'care_of', type: 'select', icon: FiUserCheck },
    { label: 'Guardian Name', key: 'guardian_name', type: 'text', icon: FiUserCheck },
    { label: 'Date of Birth', key: 'date_of_birth', type: 'date', icon: FiCalendar },
    { label: 'Gender', key: 'gender', type: 'select', icon: FiUser },
    { label: 'Mobile', key: 'mobile', type: 'tel', icon: FiPhone },
    { label: 'Country Code', key: 'country_code', type: 'text', icon: FiGlobe },
    { label: 'Email', key: 'email', type: 'email', icon: FiMail },
    { label: 'PAN Number', key: 'pan_number', type: 'text', icon: FiCreditCard },
    { label: 'Active Status', key: 'is_active', type: 'checkbox', icon: FiCheckSquare },
];

const addressFields = [
    { label: 'State', key: 'state', type: 'select', icon: FiMapPin },
    { label: 'District', key: 'district', type: 'select', icon: FiMapPin },
    { label: 'City', key: 'city', type: 'text', icon: FiHome },
    { label: 'Town/Village', key: 'village_town', type: 'text', icon: FiNavigation },
    { label: 'Pincode', key: 'pincode', type: 'text', icon: FiMapPin },
    { label: 'Address Line 1', key: 'address_line_1', type: 'text', icon: FiMapPin },
    { label: 'Address Line 2', key: 'address_line_2', type: 'text', icon: FiMapPin },
];

const fieldKeys = [
    'name', 'care_of', 'guardian_name', 'date_of_birth', 'gender', 'mobile', 'country_code',
    'email', 'pan_number', 'image', 'is_active', 'state', 'district', 'city', 'village_town',
    'pincode', 'address_line_1', 'address_line_2',
];

const formatDateForInput = (value) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const m = String(value).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        const dd = String(m[1]).padStart(2, '0');
        const mm = String(m[2]).padStart(2, '0');
        return `${m[3]}-${mm}-${dd}`;
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return '';
};

const formatDateForApi = (value) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return value;
};

const formatDateDisplay = (value) => {
    if (!value) return 'Not provided';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ProfileTab({ caData, onEdit, loading, caUsername, onRefresh }) {
    const [saveStatus, setSaveStatus] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [formData, setFormData] = useState({});
    const [careOfTypes, setCareOfTypes] = useState([]);
    const [statesAndDistricts, setStatesAndDistricts] = useState([]);
    const [utilsLoading, setUtilsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!activeModal) return;
        if (careOfTypes.length > 0 && statesAndDistricts.length > 0) return;

        let mounted = true;
        const fetchUtils = async () => {
            try {
                setUtilsLoading(true);
                const headers = getHeaders();
                const requestConfig = headers ? { headers } : {};
                const [careOfRes, statesRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/utils/care-of-types`, requestConfig),
                    axios.get(`${API_BASE_URL}/utils/states-and-districts`, requestConfig),
                ]);
                if (!mounted) return;
                if (careOfRes.data?.success && Array.isArray(careOfRes.data.data)) {
                    setCareOfTypes(careOfRes.data.data);
                }
                if (statesRes.data?.success && Array.isArray(statesRes.data.data)) {
                    setStatesAndDistricts(statesRes.data.data);
                }
            } catch (error) {
                if (mounted) console.error('Failed to load utility options:', error);
            } finally {
                if (mounted) setUtilsLoading(false);
            }
        };

        fetchUtils();
        return () => {
            mounted = false;
        };
    }, [activeModal, careOfTypes.length, statesAndDistricts.length]);

    const openEditModal = (section) => {
        const sourceFields = section === 'personal' ? personalFields : addressFields;
        const initialData = {};
        sourceFields.forEach(({ key }) => {
            if (key === 'date_of_birth') {
                initialData[key] = formatDateForInput(caData.date_of_birth);
                return;
            }
            initialData[key] = caData[key] ?? (key === 'country_code' ? '91' : '');
        });
        setFormData(initialData);
        setActiveModal(section);
    };

    const closeModal = () => {
        setActiveModal(null);
        setFormData({});
    };

    const uploadImage = async (file) => {
        setUploadingImage(true);
        try {
            return await uploadOneSaasFileUrl(file);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleProfileImageFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setSaveStatus({ type: 'error', message: 'Please select a valid image file.' });
            setTimeout(() => setSaveStatus(null), 2500);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setSaveStatus({ type: 'error', message: 'Image size should be less than 5MB.' });
            setTimeout(() => setSaveStatus(null), 2500);
            return;
        }
        try {
            const url = await uploadImage(file);
            setFormData((prev) => ({ ...prev, image: url }));
            setSaveStatus({ type: 'success', message: 'Profile image uploaded.' });
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (error) {
            setSaveStatus({ type: 'error', message: error.message || 'Failed to upload image.' });
            setTimeout(() => setSaveStatus(null), 2500);
        }
    };

    const updateCaProfile = async (updatedData) => {
        const getValue = (field, fallback = '') =>
            Object.prototype.hasOwnProperty.call(updatedData, field)
                ? updatedData[field]
                : (caData[field] ?? fallback);

        const requestBody = {
            username: caUsername,
            name: getValue('name'),
            care_of: getValue('care_of'),
            guardian_name: getValue('guardian_name'),
            date_of_birth: formatDateForApi(getValue('date_of_birth')),
            gender: getValue('gender'),
            mobile: getValue('mobile'),
            country_code: getValue('country_code', '91') || '91',
            email: getValue('email'),
            pan_number: getValue('pan_number') || null,
            image: getValue('image', null) || undefined,
            is_active: getValue('is_active', false),
            address: {
                state: getValue('state'),
                district: getValue('district'),
                city: getValue('city') || getValue('district'),
                village_town: getValue('village_town'),
                pincode: getValue('pincode'),
                address_line_1: getValue('address_line_1') || null,
                address_line_2: getValue('address_line_2') || null,
            },
        };

        try {
            setIsSaving(true);
            const result = await editCaProfile(requestBody);
            if (!result?.success) {
                setSaveStatus({ type: 'error', message: result?.message || 'Failed to update profile' });
                return false;
            }

            onEdit('name', requestBody.name);
            onEdit('care_of', requestBody.care_of);
            onEdit('guardian_name', requestBody.guardian_name);
            onEdit('date_of_birth', requestBody.date_of_birth);
            onEdit('gender', requestBody.gender);
            onEdit('mobile', requestBody.mobile);
            onEdit('country_code', requestBody.country_code);
            onEdit('email', requestBody.email);
            onEdit('pan_number', requestBody.pan_number);
            if (requestBody.image) onEdit('image', requestBody.image);
            onEdit('is_active', requestBody.is_active);
            onEdit('state', requestBody.address.state);
            onEdit('district', requestBody.address.district);
            onEdit('city', requestBody.address.city);
            onEdit('village_town', requestBody.address.village_town);
            onEdit('pincode', requestBody.address.pincode);
            onEdit('address_line_1', requestBody.address.address_line_1);
            onEdit('address_line_2', requestBody.address.address_line_2);
            return true;
        } catch (err) {
            const message =
                err.response?.data?.message ||
                (err.request ? 'No response from server. Please check your connection.' : err.message) ||
                'Failed to update profile';
            setSaveStatus({ type: 'error', message });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleModalSave = async () => {
        const payload = {};
        fieldKeys.forEach((key) => {
            payload[key] = formData[key] ?? caData[key] ?? '';
        });

        const success = await updateCaProfile(payload);
        if (!success) return;

        if (onRefresh) await onRefresh();
        setSaveStatus({ type: 'success', message: 'Profile updated successfully.' });
        closeModal();
        setTimeout(() => setSaveStatus(null), 2500);
    };

    const renderValue = (field) => {
        if (field.key === 'is_active') return caData[field.key] ? 'Active' : 'Inactive';
        if (field.key === 'date_of_birth') return formatDateDisplay(caData[field.key]);
        if (field.key === 'gender') {
            const g = caData[field.key];
            return g ? String(g).charAt(0).toUpperCase() + String(g).slice(1) : 'Not provided';
        }
        return caData[field.key] || 'Not provided';
    };

    const renderList = (fields) => (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fields.map((field) => {
                const Icon = field.icon;
                return (
                    <div
                        key={field.key}
                        className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2"
                    >
                        <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-500 ring-1 ring-slate-200">
                                <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate">{field.label}</span>
                        </dt>
                        <dd className="mt-1 break-words text-xs font-semibold leading-snug text-slate-900">
                            {renderValue(field) || '—'}
                        </dd>
                    </div>
                );
            })}
        </dl>
    );

    const renderSkeletonCard = (count = 8) => (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-7 w-20 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[...Array(count)].map((_, index) => (
                    <div key={`sk-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                        <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-200" />
                    </div>
                ))}
            </div>
        </div>
    );

    const modalFields = activeModal === 'personal' ? personalFields : addressFields;
    const selectedStateName = formData.state || caData.state || '';
    const selectedStateData = statesAndDistricts.find((stateItem) => stateItem.name === selectedStateName);
    const districtOptions = selectedStateData?.districts || [];
    const currentImage = formData.image || caData.image || '';

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
                <div className="border-b border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Profile Details</h3>
                            <p className="text-xs text-slate-500">CA information overview</p>
                        </div>
                        {saveStatus && (
                            <div
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                                    saveStatus.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
                                }`}
                            >
                                {saveStatus.type === 'success' ? (
                                    <FiCheck className="h-3.5 w-3.5" />
                                ) : (
                                    <FiX className="h-3.5 w-3.5" />
                                )}
                                {saveStatus.message}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-3.5">
                    {loading ? (
                        <div className="space-y-3">
                            {renderSkeletonCard(Math.min(10, personalFields.length))}
                            {renderSkeletonCard(Math.min(10, addressFields.length))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/55 via-white to-white p-3.5">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                            <FiUserCheck className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">Personal Details</h4>
                                            <p className="text-[11px] text-slate-500">Identity and contact</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openEditModal('personal')}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                                    >
                                        <FiEdit className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                </div>
                                {renderList(personalFields)}
                            </section>

                            <section className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/55 via-white to-white p-3.5">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                            <FiNavigation className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">Address</h4>
                                            <p className="text-[11px] text-slate-500">Communication address</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openEditModal('address')}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                                    >
                                        <FiEdit className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                </div>
                                {renderList(addressFields)}
                            </section>
                        </div>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {activeModal && (
                    <motion.div
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/45 px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        >
                            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                                <h4 className="text-sm font-semibold text-slate-900">
                                    Edit {activeModal === 'personal' ? 'Personal Details' : 'Address'}
                                </h4>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    disabled={isSaving}
                                >
                                    <FiX className="h-4 w-4" />
                                </button>
                            </div>
                            <div
                                className="min-h-0 flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {activeModal === 'personal' && (
                                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Profile Picture
                                        </p>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-white ring-1 ring-slate-100">
                                                {currentImage ? (
                                                    <img
                                                        src={currentImage}
                                                        alt="Profile preview"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                                                        <FiUser className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleProfileImageFile(e.target.files?.[0])}
                                                />
                                                <div
                                                    className={`rounded-lg border-2 border-dashed px-3 py-2 text-xs ${
                                                        uploadingImage
                                                            ? 'border-indigo-300 bg-indigo-50/60 text-indigo-700'
                                                            : 'border-slate-300 bg-white text-slate-600'
                                                    }`}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        handleProfileImageFile(e.dataTransfer.files?.[0]);
                                                    }}
                                                >
                                                    <p className="font-medium">Drag & drop image here</p>
                                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                                        PNG, JPG, JPEG up to 5MB
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploadingImage}
                                                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
                                                    >
                                                        {uploadingImage ? (
                                                            <FiLoader className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <FiUpload className="h-3.5 w-3.5" />
                                                        )}
                                                        {uploadingImage ? 'Uploading...' : 'Select Image'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {modalFields.map((field) => (
                                        <div
                                            key={field.key}
                                            className={field.type === 'checkbox' ? 'sm:col-span-2' : ''}
                                        >
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                {field.label}
                                            </label>
                                            {field.key === 'care_of' ? (
                                                <select
                                                    value={formData[field.key] ?? ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                                    }
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                >
                                                    <option value="">
                                                        {utilsLoading ? 'Loading...' : 'Select care of type'}
                                                    </option>
                                                    {careOfTypes.map((typeValue) => (
                                                        <option key={typeValue} value={typeValue}>
                                                            {typeValue}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.key === 'state' ? (
                                                <select
                                                    value={formData[field.key] ?? ''}
                                                    onChange={(e) => {
                                                        const nextState = e.target.value;
                                                        setFormData((prev) => {
                                                            const nextDistrictOptions =
                                                                statesAndDistricts.find((s) => s.name === nextState)
                                                                    ?.districts || [];
                                                            const shouldResetDistrict = !nextDistrictOptions.includes(
                                                                prev.district || ''
                                                            );
                                                            return {
                                                                ...prev,
                                                                state: nextState,
                                                                district: shouldResetDistrict ? '' : prev.district || '',
                                                                city: shouldResetDistrict ? '' : prev.city || '',
                                                            };
                                                        });
                                                    }}
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                >
                                                    <option value="">
                                                        {utilsLoading ? 'Loading...' : 'Select state'}
                                                    </option>
                                                    {statesAndDistricts.map((stateItem) => (
                                                        <option key={stateItem.name} value={stateItem.name}>
                                                            {stateItem.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.key === 'district' ? (
                                                <select
                                                    value={formData[field.key] ?? ''}
                                                    onChange={(e) => {
                                                        const district = e.target.value;
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            district,
                                                            city: prev.city || district,
                                                        }));
                                                    }}
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                    disabled={!selectedStateName}
                                                >
                                                    <option value="">
                                                        {!selectedStateName
                                                            ? 'Select state first'
                                                            : utilsLoading
                                                              ? 'Loading...'
                                                              : 'Select district'}
                                                    </option>
                                                    {districtOptions.map((districtName) => (
                                                        <option key={districtName} value={districtName}>
                                                            {districtName}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.type === 'select' ? (
                                                <select
                                                    value={formData[field.key] ?? ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                                    }
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                >
                                                    <option value="">Select gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            ) : field.type === 'checkbox' ? (
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={!!formData[field.key]}
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            [field.key]: !prev[field.key],
                                                        }))
                                                    }
                                                    className={`w-full rounded-lg border px-3 py-2.5 transition-all ${
                                                        formData[field.key]
                                                            ? 'border-emerald-200 bg-emerald-50'
                                                            : 'border-slate-200 bg-slate-50'
                                                    }`}
                                                >
                                                    <span className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-slate-700">Status</span>
                                                        <span
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                                formData[field.key] ? 'bg-emerald-500' : 'bg-slate-300'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                                                    formData[field.key]
                                                                        ? 'translate-x-5'
                                                                        : 'translate-x-0.5'
                                                                }`}
                                                            />
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={`mt-1 block text-left text-xs font-semibold ${
                                                            formData[field.key]
                                                                ? 'text-emerald-700'
                                                                : 'text-slate-600'
                                                        }`}
                                                    >
                                                        {formData[field.key] ? 'Active' : 'Inactive'}
                                                    </span>
                                                </button>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    value={formData[field.key] ?? ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            [field.key]: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleModalSave}
                                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <FiLoader className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <FiSave className="h-3.5 w-3.5" />
                                    )}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
