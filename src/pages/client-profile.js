import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Sidebar } from '../components/header';
import {
    FiUser,
    FiMail,
    FiPhone,
    FiMapPin,
    FiCalendar,
    FiBriefcase,
    FiKey,
    FiClipboard,
    FiFileText,
    FiDollarSign,
    FiFile,
    FiSettings,
    FiEdit,
    FiArchive,
    FiMessageSquare,
    FiRepeat,
    FiLayers,
    FiCheckSquare,
    FiPlus,
    FiTrash2,
    FiEye,
    FiDownload,
    FiSearch,
    FiCheck,
    FiX,
    FiUpload,
    FiSend,
    FiHome,
    FiUserCheck,
    FiCreditCard,
    FiClock,
    FiChevronLeft,
    FiChevronRight,
    FiChevronsRight,
    FiSave,
    FiGlobe,
    FiNavigation,
    FiGrid,
    FiLoader,
    FiRefreshCw,
    FiInfo,
    FiMinimize2,
    FiMaximize2,
    FiChevronDown
} from 'react-icons/fi';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { uploadOneSaasFileUrl } from '../utils/onesaas-upload';
import { toast } from 'react-hot-toast';
import { checkPermissionSync } from '../utils/permission-helper';

// Import other components
import FirmsTab from "../ClientComponents/FirmsTab";
import PasswordTab from "../ClientComponents/PasswordTab";
import QuotationTab from "../ClientComponents/QuotationTab";
import TaskTab from "../ClientComponents/TaskTab";
import BillingTab from "../ClientComponents/BillingTab";
import LedgerTab from "../ClientComponents/LedgerTab";
import NotesTab from "../ClientComponents/NotesTab";
import RecurringTab from "../ClientComponents/RecurringTab";
import DocumentsTab from "../ClientComponents/DocumentsTab";
import ChattingTab from "../ClientComponents/ChattingTab";
import AutomationTab from "../ClientComponents/AutomationTab";

const BasicDetailsTab = ({ clientData, onEdit, loading, clientUsername, onRefresh }) => {
    const [saveStatus, setSaveStatus] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [formData, setFormData] = useState({});
    const [careOfTypes, setCareOfTypes] = useState([]);
    const [statesAndDistricts, setStatesAndDistricts] = useState([]);
    const [utilsLoading, setUtilsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    const personalFields = [
        { label: "Full Name", key: "name", type: "text", icon: FiUser },
        { label: "Care Of", key: "care_of", type: "select", icon: FiUserCheck },
        { label: "Guardian Name", key: "guardian_name", type: "text", icon: FiUserCheck },
        { label: "Date of Birth", key: "date_of_birth", type: "date", icon: FiCalendar },
        { label: "Gender", key: "gender", type: "select", icon: FiUser },
        { label: "Mobile", key: "mobile", type: "tel", icon: FiPhone },
        { label: "Country Code", key: "country_code", type: "text", icon: FiGlobe },
        { label: "Email", key: "email", type: "email", icon: FiMail },
        { label: "PAN Number", key: "pan_number", type: "text", icon: FiCreditCard },
        { label: "Active Status", key: "is_active", type: "checkbox", icon: FiCheckSquare },
    ];

    const addressFields = [
        { label: "State", key: "state", type: "select", icon: FiMapPin },
        { label: "District", key: "district", type: "select", icon: FiMapPin },
        { label: "City", key: "city", type: "text", icon: FiHome },
        { label: "Town/Village", key: "village_town", type: "text", icon: FiNavigation },
        { label: "Pincode", key: "pincode", type: "text", icon: FiMapPin },
        { label: "Address Line 1", key: "address_line_1", type: "text", icon: FiMapPin },
        { label: "Address Line 2", key: "address_line_2", type: "text", icon: FiMapPin },
    ];

    const fieldKeys = [
        "name", "care_of", "guardian_name", "date_of_birth", "gender", "mobile", "country_code",
        "email", "pan_number", "image", "is_active", "state", "district", "city", "village_town",
        "pincode", "address_line_1", "address_line_2"
    ];

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
                if (mounted) {
                    console.error("Failed to load utility options:", error);
                }
            } finally {
                if (mounted) setUtilsLoading(false);
            }
        };

        fetchUtils();
        return () => { mounted = false; };
    }, [activeModal, careOfTypes.length, statesAndDistricts.length]);

    const formatDateForInput = (value) => {
        if (!value) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const m = String(value).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
            const dd = String(m[1]).padStart(2, "0");
            const mm = String(m[2]).padStart(2, "0");
            const yyyy = m[3];
            return `${yyyy}-${mm}-${dd}`;
        }
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
        return "";
    };

    const openEditModal = (section) => {
        const sourceFields = section === "personal" ? personalFields : addressFields;
        const initialData = {};
        sourceFields.forEach(({ key }) => {
            if (key === "date_of_birth") {
                initialData[key] = formatDateForInput(clientData.date_of_birth);
                return;
            }
            initialData[key] = clientData[key] ?? (key === "country_code" ? "91" : "");
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
        if (!file.type.startsWith("image/")) {
            setSaveStatus({ type: "error", message: "Please select a valid image file." });
            setTimeout(() => setSaveStatus(null), 2500);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setSaveStatus({ type: "error", message: "Image size should be less than 5MB." });
            setTimeout(() => setSaveStatus(null), 2500);
            return;
        }
        try {
            const url = await uploadImage(file);
            setFormData((prev) => ({ ...prev, image: url }));
            setSaveStatus({ type: "success", message: "Profile image uploaded." });
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (error) {
            setSaveStatus({ type: "error", message: error.message || "Failed to upload image." });
            setTimeout(() => setSaveStatus(null), 2500);
        }
    };

    const formatDateForApi = (value) => {
        if (!value) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split("T")[0];
        }
        return value;
    };

    const updateClientProfile = async (updatedData) => {
        const headers = getHeaders();
        if (!headers) {
            setSaveStatus({ type: "error", message: "Authentication headers missing. Please login again." });
            return false;
        }

        const getValue = (field, fallback = "") =>
            Object.prototype.hasOwnProperty.call(updatedData, field) ? updatedData[field] : (clientData[field] ?? fallback);

        const requestBody = {
            username: clientUsername,
            name: getValue("name"),
            care_of: getValue("care_of"),
            guardian_name: getValue("guardian_name"),
            date_of_birth: formatDateForApi(getValue("date_of_birth")),
            gender: getValue("gender"),
            mobile: getValue("mobile"),
            country_code: getValue("country_code", "91") || "91",
            email: getValue("email"),
            pan_number: getValue("pan_number"),
            image: getValue("image", null),
            is_active: getValue("is_active", false),
            address: {
                state: getValue("state"),
                district: getValue("district"),
                city: getValue("city"),
                village_town: getValue("village_town"),
                pincode: getValue("pincode"),
                address_line_1: getValue("address_line_1"),
                address_line_2: getValue("address_line_2"),
            },
        };

        try {
            setIsSaving(true);
            const response = await axios.post(`${API_BASE_URL}/client/details/edit-profile`, requestBody, { headers });
            if (!response.data.success) {
                setSaveStatus({ type: "error", message: response.data.message || "Failed to update profile" });
                return false;
            }

            onEdit("name", requestBody.name);
            onEdit("care_of", requestBody.care_of);
            onEdit("guardian_name", requestBody.guardian_name);
            onEdit("date_of_birth", requestBody.date_of_birth);
            onEdit("gender", requestBody.gender);
            onEdit("mobile", requestBody.mobile);
            onEdit("country_code", requestBody.country_code);
            onEdit("email", requestBody.email);
            onEdit("pan_number", requestBody.pan_number);
            onEdit("image", requestBody.image);
            onEdit("is_active", requestBody.is_active);
            onEdit("state", requestBody.address.state);
            onEdit("district", requestBody.address.district);
            onEdit("city", requestBody.address.city);
            onEdit("village_town", requestBody.address.village_town);
            onEdit("pincode", requestBody.address.pincode);
            onEdit("address_line_1", requestBody.address.address_line_1);
            onEdit("address_line_2", requestBody.address.address_line_2);
            return true;
        } catch (err) {
            let errorMessage = "Failed to update profile";
            if (err.response) {
                errorMessage = err.response.data?.message || `Error ${err.response.status}: Update failed`;
            } else if (err.request) {
                errorMessage = "No response from server. Please check your connection.";
            }
            setSaveStatus({ type: "error", message: errorMessage });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleModalSave = async () => {
        const payload = {};
        fieldKeys.forEach((key) => {
            payload[key] = formData[key] ?? clientData[key] ?? "";
        });

        const success = await updateClientProfile(payload);
        if (!success) return;

        if (onRefresh) {
            await onRefresh();
        }
        setSaveStatus({ type: "success", message: "Profile updated successfully." });
        closeModal();
        setTimeout(() => setSaveStatus(null), 2500);
    };

    const renderValue = (field) => {
        if (field.key === "is_active") return clientData[field.key] ? "Active" : "Inactive";
        return clientData[field.key] || "Not provided";
    };

    const renderList = (fields) => (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fields.map((field) => {
                const Icon = field.icon;
                const value = renderValue(field);
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
                        <dd className="mt-1 text-xs font-semibold leading-snug text-slate-900 break-words">
                            {value || "—"}
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
                    <div
                        key={`sk-${index}`}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                        <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                        <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-200" />
                    </div>
                ))}
            </div>
        </div>
    );

    const modalFields = activeModal === "personal" ? personalFields : addressFields;
    const selectedStateName = formData.state || clientData.state || "";
    const selectedStateData = statesAndDistricts.find((stateItem) => stateItem.name === selectedStateName);
    const districtOptions = selectedStateData?.districts || [];
    const currentImage = formData.image || clientData.image || "";

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
                            <p className="text-xs text-slate-500">Compact client information overview</p>
                        </div>
                        {saveStatus && (
                            <div className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${saveStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {saveStatus.type === "success" ? <FiCheck className="h-3.5 w-3.5" /> : <FiX className="h-3.5 w-3.5" />}
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
                                     {checkPermissionSync('client_edit') && (
                                         <button
                                             type="button"
                                             onClick={() => openEditModal("personal")}
                                             className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                                         >
                                             <FiEdit className="h-3.5 w-3.5" />
                                             Edit
                                         </button>
                                     )}
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
                                     {checkPermissionSync('client_edit') && (
                                         <button
                                             type="button"
                                             onClick={() => openEditModal("address")}
                                             className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                                         >
                                             <FiEdit className="h-3.5 w-3.5" />
                                             Edit
                                         </button>
                                     )}
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
                            <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                                <h4 className="text-sm font-semibold text-slate-900">
                                    Edit {activeModal === "personal" ? "Personal Details" : "Address"}
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
                                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                            >
                                {activeModal === "personal" && (
                                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Profile Picture
                                        </p>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-white ring-1 ring-slate-100">
                                                {currentImage ? (
                                                    <img src={currentImage} alt="Profile preview" className="h-full w-full object-cover" />
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
                                                    className={`rounded-lg border-2 border-dashed px-3 py-2 text-xs ${uploadingImage ? "border-indigo-300 bg-indigo-50/60 text-indigo-700" : "border-slate-300 bg-white text-slate-600"}`}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        handleProfileImageFile(e.dataTransfer.files?.[0]);
                                                    }}
                                                >
                                                    <p className="font-medium">Drag & drop image here</p>
                                                    <p className="mt-0.5 text-[11px] text-slate-500">PNG, JPG, JPEG up to 5MB</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploadingImage}
                                                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
                                                    >
                                                        {uploadingImage ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiUpload className="h-3.5 w-3.5" />}
                                                        {uploadingImage ? "Uploading..." : "Select Image"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {modalFields.map((field) => (
                                        <div key={field.key} className={field.type === "checkbox" ? "sm:col-span-2" : ""}>
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                {field.label}
                                            </label>
                                            {field.key === "care_of" ? (
                                                <select
                                                    value={formData[field.key] ?? ""}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                >
                                                    <option value="">{utilsLoading ? "Loading..." : "Select care of type"}</option>
                                                    {careOfTypes.map((typeValue) => (
                                                        <option key={typeValue} value={typeValue}>
                                                            {typeValue}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.key === "state" ? (
                                                <select
                                                    value={formData[field.key] ?? ""}
                                                    onChange={(e) => {
                                                        const nextState = e.target.value;
                                                        setFormData((prev) => {
                                                            const nextDistrictOptions = statesAndDistricts.find((s) => s.name === nextState)?.districts || [];
                                                            const shouldResetDistrict = !nextDistrictOptions.includes(prev.district || "");
                                                            return {
                                                                ...prev,
                                                                state: nextState,
                                                                district: shouldResetDistrict ? "" : (prev.district || ""),
                                                            };
                                                        });
                                                    }}
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                >
                                                    <option value="">{utilsLoading ? "Loading..." : "Select state"}</option>
                                                    {statesAndDistricts.map((stateItem) => (
                                                        <option key={stateItem.name} value={stateItem.name}>
                                                            {stateItem.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.key === "district" ? (
                                                <select
                                                    value={formData[field.key] ?? ""}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                    disabled={!selectedStateName}
                                                >
                                                    <option value="">
                                                        {!selectedStateName ? "Select state first" : (utilsLoading ? "Loading..." : "Select district")}
                                                    </option>
                                                    {districtOptions.map((districtName) => (
                                                        <option key={districtName} value={districtName}>
                                                            {districtName}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.type === "select" ? (
                                                <select
                                                    value={formData[field.key] ?? ""}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                >
                                                    <option value="">Select gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            ) : field.type === "checkbox" ? (
                                                activeModal === "personal" ? (
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={!!formData[field.key]}
                                                        onClick={() => setFormData((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                                                        className={`w-full rounded-lg border px-3 py-2.5 transition-all ${formData[field.key]
                                                            ? "border-emerald-200 bg-emerald-50"
                                                            : "border-slate-200 bg-slate-50"
                                                            }`}
                                                    >
                                                        <span className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-slate-700">Status</span>
                                                            <span
                                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData[field.key] ? "bg-emerald-500" : "bg-slate-300"
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${formData[field.key] ? "translate-x-5" : "translate-x-0.5"
                                                                        }`}
                                                                />
                                                            </span>
                                                        </span>
                                                        <span className={`mt-1 block text-left text-xs font-semibold ${formData[field.key] ? "text-emerald-700" : "text-slate-600"}`}>
                                                            {formData[field.key] ? "Active" : "Inactive"}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!formData[field.key]}
                                                            onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">Active</span>
                                                    </label>
                                                )
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    value={formData[field.key] ?? ""}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="sticky bottom-0 z-10 shrink-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
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
                                    {isSaving ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiSave className="h-3.5 w-3.5" />}
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const EditModal = ({ isOpen, onClose, field, value, onSave, type = 'text' }) => {
    const [inputValue, setInputValue] = useState(value);

    const handleSave = () => {
        onSave(inputValue);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Edit {field}</h2>
                            <p className="text-blue-100 text-xs mt-1">Update the {field.toLowerCase()} information</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        {field}
                    </label>
                    {type === 'textarea' ? (
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            rows="4"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all bg-gray-50/50 text-sm"
                        />
                    ) : (
                        <input
                            type={type}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        />
                    )}
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const DeleteModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">{title}</h2>
                            <p className="text-red-100 text-xs mt-1">This action cannot be undone</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5">
                    <div className="flex items-center justify-center mb-3">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                            <FiTrash2 className="w-7 h-7 text-red-600" />
                        </div>
                    </div>
                    <p className="text-gray-700 text-center font-medium">{message}</p>
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-rose-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const AddFirmModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'Proprietorship',
        pan: '',
        gst: ''
    });

    const handleSubmit = () => {
        if (formData.name.trim() && formData.pan.trim()) {
            onAdd(formData);
            setFormData({ name: '', type: 'Proprietorship', pan: '', gst: '' });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Add New Firm</h2>
                            <p className="text-blue-100 text-xs mt-1">Register a new business entity</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Firm Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                            placeholder="Enter firm name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Business Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        >
                            <option value="Proprietorship">Proprietorship</option>
                            <option value="Partnership">Partnership</option>
                            <option value="LLP">LLP</option>
                            <option value="Private Limited">Private Limited</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">PAN Number</label>
                        <input
                            type="text"
                            value={formData.pan}
                            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                            placeholder="Enter PAN number"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">GST Number (Optional)</label>
                        <input
                            type="text"
                            value={formData.gst}
                            onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                            placeholder="Enter GST number"
                        />
                    </div>
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                        Add Firm
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const EditFirmModal = ({ isOpen, onClose, onSave, firm }) => {
    const [formData, setFormData] = useState({
        name: firm?.name || '',
        type: firm?.type || 'Proprietorship',
        pan: firm?.pan || '',
        gst: firm?.gst || ''
    });

    React.useEffect(() => {
        if (firm) {
            setFormData({
                name: firm.name,
                type: firm.type,
                pan: firm.pan,
                gst: firm.gst
            });
        }
    }, [firm]);

    const handleSubmit = () => {
        if (formData.name.trim() && formData.pan.trim()) {
            onSave(formData);
            onClose();
        }
    };

    if (!isOpen || !firm) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Edit Firm</h2>
                            <p className="text-blue-100 text-xs mt-1">Update firm details</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Firm Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Business Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        >
                            <option value="Proprietorship">Proprietorship</option>
                            <option value="Partnership">Partnership</option>
                            <option value="LLP">LLP</option>
                            <option value="Private Limited">Private Limited</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">PAN Number</label>
                        <input
                            type="text"
                            value={formData.pan}
                            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">GST Number</label>
                        <input
                            type="text"
                            value={formData.gst}
                            onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm"
                        />
                    </div>
                </div>
                <div className="px-5 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
// TabLink Component - Add this near other components
const TabLink = ({ to, icon: Icon, label, isActive, onClick }) => {
    return (
        <motion.button
            onClick={() => onClick(to)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                }`}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.98 }}
        >
            <motion.div
                animate={{
                    rotate: isActive ? [0, 5, 0] : 0,
                    scale: isActive ? 1.1 : 1
                }}
                transition={{ duration: 0.2 }}
                className="mb-1"
            >
                <Icon className="w-4 h-4" />
            </motion.div>
            <span className="text-xs font-medium text-center leading-tight">{label}</span>
        </motion.button>
    );
};

// CompactTabIcon Component for minimized view with hover tooltip
// CompactTabIcon Component for minimized view with name under icon - CENTERED
const CompactTabIcon = ({ to, icon: Icon, label, isActive, onClick }) => {
    return (
        <motion.button
            onClick={() => onClick(to)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[70px] ${isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                }`}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
        >
            <Icon className="w-4 h-4 mb-1 mx-auto" />
            <span className="text-[10px] font-medium text-center leading-tight w-full">{label}</span>
        </motion.button>
    );
};

// Main Component - ClientProfile
// Main Component - ClientProfile
const ClientProfile = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [tabsMinimized, setTabsMinimized] = useState(() => {
        const saved = localStorage.getItem('tabsMinimized');
        // Default to true (minimized/icons only) if no saved preference
        return saved ? JSON.parse(saved) : true;
    });
    const [editModal, setEditModal] = useState({ isOpen: false, field: '', value: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previousUsername, setPreviousUsername] = useState(null);

    // Get both username and tab from URL
    const { username, tab = 'basic-details' } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Client data structure matching API response
    const [clientData, setClientData] = useState({
        // Basic info
        name: "",
        care_of: "",
        guardian_type: "",
        guardian_name: "",
        date_of_birth: "",
        gender: "",
        mobile: "",
        country_code: "",
        email: "",
        pan_number: "",
        image: null,
        is_active: true,

        // Address info
        state: "",
        district: "",
        city: "",
        village_town: "",
        pincode: "",
        address_line_1: "",
        address_line_2: "",

        // Transactional info
        balance: 0,
        debit: 0,
        credit: 0
    });

    // Fetch client data from API
    const fetchClientData = useCallback(async (currentUsername) => {
        const usernameToFetch = currentUsername || username;

        if (!usernameToFetch) {
            setError('No username provided');
            setLoading(false);
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            setError('Authentication headers missing. Please login again.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await axios.get(
                `${API_BASE_URL}/client/details/profile?username=${encodeURIComponent(usernameToFetch)}`,
                { headers }
            );

            if (response.data.success && response.data.data) {
                const apiData = response.data.data;

                // Transform API data to match our component structure
                setClientData({
                    // Basic info
                    name: apiData.basic?.name || "",
                    care_of: apiData.basic?.care_of || "",
                    guardian_type: apiData.basic?.guardian_type || apiData.basic?.care_of || "",
                    guardian_name: apiData.basic?.guardian_name || "",
                    date_of_birth: apiData.basic?.date_of_birth ?
                        new Date(apiData.basic.date_of_birth).toLocaleDateString('en-GB') : "",
                    gender: apiData.basic?.gender || "",
                    mobile: apiData.basic?.mobile || "",
                    country_code: apiData.basic?.country_code || "91",
                    email: apiData.basic?.email || "",
                    pan_number: apiData.basic?.pan_number || "",
                    image: apiData.basic?.image || null,
                    is_active: apiData.basic?.is_active || false,

                    // Address info
                    state: apiData.basic?.address?.state || "",
                    district: apiData.basic?.address?.district || "",
                    city: apiData.basic?.address?.city || "",
                    village_town: apiData.basic?.address?.village_town || "",
                    pincode: apiData.basic?.address?.pincode || "",
                    address_line_1: apiData.basic?.address?.address_line_1 || "",
                    address_line_2: apiData.basic?.address?.address_line_2 || "",

                    // Transactional info
                    balance: apiData.transactional?.balance || 0,
                    debit: apiData.transactional?.debit || 0,
                    credit: apiData.transactional?.credit || 0
                });
            } else {
                setError(response.data.message || 'Failed to fetch client data');
            }
        } catch (err) {
            console.error('Error fetching client data:', err);
            if (err.response) {
                if (err.response.status === 401) {
                    setError('Unauthorized. Please login again.');
                } else if (err.response.status === 404) {
                    setError(`Client with username "${usernameToFetch}" not found.`);
                } else {
                    setError(`Error ${err.response.status}: ${err.response.data?.message || 'Failed to fetch client data'}`);
                }
            } else if (err.request) {
                setError('No response from server. Please check your connection.');
            } else {
                setError(`Error: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }, [username]);

    // Watch for URL changes and fetch new data
    useEffect(() => {
        // Only fetch if username has changed
        if (username && username !== previousUsername) {
            // Reset state for new user
            setClientData({
                name: "", care_of: "", guardian_type: "", guardian_name: "", date_of_birth: "", gender: "",
                mobile: "", country_code: "", email: "", pan_number: "", image: null,
                is_active: false, state: "", district: "", city: "", village_town: "",
                pincode: "", address_line_1: "", address_line_2: "", balance: 0,
                debit: 0, credit: 0
            });
            setError(null);
            setPreviousUsername(username);

            // Fetch new data
            fetchClientData(username);
        }

        // If no tab specified, redirect to basic-details
        if (username && !tab) {
            navigate(`/client/profile/${username}/basic-details`, { replace: true });
        }
    }, [username, tab, location.pathname, previousUsername, fetchClientData, navigate]);

    // Initial fetch
    useEffect(() => {
        if (username && !previousUsername) {
            setPreviousUsername(username);
            fetchClientData(username);
        }
    }, [username, previousUsername, fetchClientData]);

    // Persist tabs minimized state
    useEffect(() => {
        localStorage.setItem('tabsMinimized', JSON.stringify(tabsMinimized));
    }, [tabsMinimized]);

    // Profile tabs data - updated with URL-friendly IDs
    const profileTabs = [
        { id: 'basic-details', name: 'Basic Details', icon: FiUser },
        { id: 'firms', name: 'Firms', icon: FiBriefcase },
        { id: 'password', name: 'Password', icon: FiKey },
        { id: 'quotation', name: 'Quotation', icon: FiClipboard },
        { id: 'task', name: 'Task', icon: FiCheckSquare },
        { id: 'billing', name: 'Billing', icon: FiFileText },
        { id: 'ledger', name: 'Ledger', icon: FiDollarSign },
        { id: 'notes', name: 'Notes', icon: FiFile },
        { id: 'compliance', name: 'Compliance', icon: FiLayers },
        { id: 'documents', name: 'Documents', icon: FiArchive },
        { id: 'chatting', name: 'Chatting', icon: FiMessageSquare },
        { id: 'automation', name: 'Automation', icon: FiSettings }
    ];

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Handle field editing
    const handleEditField = (field, value) => {
        setClientData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const saveEdit = (newValue) => {
        setClientData(prev => ({
            ...prev,
            [editModal.field]: newValue
        }));
        setEditModal({ isOpen: false, field: '', value: '' });
    };

    // Handle tab navigation
    const handleTabClick = (tabId) => {
        navigate(`/client/profile/${username}/${tabId}`);
    };

    // Toggle tabs minimized state
    const toggleTabsMinimized = () => {
        setTabsMinimized(!tabsMinimized);
    };

    // Render content based on active tab
    const renderTabContent = () => {
        // Map URL-friendly IDs to component keys
        const tabMap = {
            'basic-details': 'basic',
            'firms': 'firms',
            'password': 'password',
            'quotation': 'quotation',
            'task': 'task',
            'billing': 'billing',
            'ledger': 'ledger',
            'notes': 'notes',
            'compliance': 'compliance',
            'documents': 'documents',
            'chatting': 'chatting',
            'automation': 'automation'
        };

        const componentKey = tabMap[tab] || 'basic';

        const tabComponents = {
            basic: <BasicDetailsTab
                clientData={clientData}
                onEdit={handleEditField}
                loading={loading}
                clientUsername={username}
                onRefresh={() => fetchClientData(username)}
            />,
            firms: <FirmsTab clientUsername={username} />,
            password: <PasswordTab clientUsername={username} />,
            quotation: <QuotationTab clientUsername={username} />,
            task: <TaskTab clientUsername={username} />,
            billing: <BillingTab clientUsername={username} />,
            ledger: <LedgerTab clientUsername={username} />,
            notes: <NotesTab clientUsername={username} />,
            compliance: <RecurringTab clientUsername={username} />,
            documents: <DocumentsTab clientUsername={username} />,
            chatting: (
                <ChattingTab
                    clientData={clientData}
                    loading={loading}
                />
            ),
            automation: <AutomationTab clientUsername={username} />
        };

        return tabComponents[componentKey] || tabComponents['basic'];
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Loading State */}
                        {loading && (
                            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-6 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-600 font-medium">Loading client profile...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                        <FiX className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Error Loading Profile</h3>
                                        <p className="text-gray-600 text-sm mt-1">{error}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => fetchClientData(username)}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-sm flex items-center gap-2"
                                    >
                                        <FiRefreshCw className="w-4 h-4" />
                                        Retry
                                    </button>
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 text-sm"
                                    >
                                        Go Back
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Client Profile Content */}
                        {!loading && !error && (
                            <>
                                {/* Breadcrumb */}
                                <nav
                                    className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-slate-500 sm:text-sm"
                                    aria-label="Breadcrumb"
                                >
                                    <button
                                        type="button"
                                        onClick={() => navigate('/client/view')}
                                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                                    >
                                        <FiHome className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                        Clients
                                    </button>
                                    <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
                                    <span className="max-w-[12rem] truncate font-medium text-slate-800 sm:max-w-xs">
                                        {clientData.name}
                                    </span>
                                    <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
                                    <span className="capitalize text-slate-600">{tab.replace('-', ' ')}</span>
                                </nav>

                                <motion.section
                                    className="mb-4 px-3 py-2.5 sm:px-4 sm:py-3"
                                    style={{
                                        borderRadius: '1rem',
                                        background: 'linear-gradient(145deg, #f8fafc 0%, #e8ecfe 38%, #f1edff 100%)',
                                        border: '1px solid rgba(199, 210, 254, 0.95)',
                                        boxShadow:
                                            '0 1px 3px rgba(49, 46, 129, 0.08), 0 0 0 1px rgba(30, 27, 75, 0.045)',
                                    }}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                                    aria-label="Client summary"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200/90 sm:h-11 sm:w-11">
                                                {clientData.image ? (
                                                    <img
                                                        src={clientData.image}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                                                        <FiUser className="h-[18px] w-[18px]" aria-hidden />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1 text-left">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                    Client
                                                </p>
                                                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                    <h1 className="min-w-0 max-w-full truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-lg">
                                                        {clientData.name || '—'}
                                                    </h1>
                                                    <span
                                                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${clientData.is_active
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                            : 'border-amber-200 bg-amber-50 text-amber-900'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${clientData.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                            aria-hidden
                                                        />
                                                        {clientData.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            className="flex w-full flex-col px-2 py-1.5 text-left sm:w-auto sm:min-w-[6.5rem] sm:text-right"
                                            style={{
                                                borderRadius: '0.75rem',
                                                border: '1px solid rgba(255, 255, 255, 0.9)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                                                boxShadow: '0 1px 2px rgba(49, 46, 129, 0.07)',
                                                backdropFilter: 'blur(2px)',
                                            }}
                                            role="status"
                                            aria-label="Account balance"
                                        >
                                            <span
                                                className={`mt-0.5 text-center text-sm font-semibold tabular-nums tracking-tight sm:text-base ${Number(clientData.balance ?? 0) < 0
                                                    ? 'text-rose-700'
                                                    : Number(clientData.balance ?? 0) > 0
                                                        ? 'text-emerald-700'
                                                        : 'text-slate-800'
                                                    } ${!checkPermissionSync('task_fees_view') ? 'blur-[3.5px] select-none' : ''}`}
                                            >
                                                {Number(clientData.balance ?? 0) < 0
                                                    ? `- ₹${Math.abs(clientData.balance).toLocaleString('en-IN', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}`
                                                    : `₹${Number(clientData.balance ?? 0).toLocaleString('en-IN', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}`
                                                }

                                            </span>
                                        </div>
                                    </div>
                                    <dl
                                        className="mt-3 grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-4"
                                        style={{ borderTop: '1px solid rgba(199, 210, 254, 0.8)' }}
                                    >
                                        <div
                                            className="min-w-0 rounded-lg px-2.5 py-2"
                                            style={{
                                                background: 'rgba(238, 242, 255, 0.72)',
                                                border: '1px solid rgba(199, 210, 254, 0.9)',
                                            }}
                                        >
                                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Guardian
                                            </dt>
                                            <dd className="mt-0.5 truncate text-xs font-medium text-slate-900 sm:text-[13px]">
                                                {(() => {
                                                    const prefix = (clientData.guardian_type || clientData.care_of || '').trim();
                                                    const gname = (clientData.guardian_name || '').trim();
                                                    const line = [prefix, gname].filter(Boolean).join(' ').trim();
                                                    return line || '—';
                                                })()}
                                            </dd>
                                        </div>
                                        <div
                                            className="min-w-0 rounded-lg px-2.5 py-2"
                                            style={{
                                                background: 'rgba(236, 254, 255, 0.72)',
                                                border: '1px solid rgba(186, 230, 253, 0.9)',
                                            }}
                                        >
                                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Date of birth
                                            </dt>
                                            <dd className="mt-0.5 text-xs font-medium tabular-nums text-slate-900 sm:text-[13px]">
                                                {formatDate(clientData.date_of_birth) || '—'}
                                            </dd>
                                        </div>
                                        <div
                                            className="min-w-0 rounded-lg px-2.5 py-2 sm:col-span-2 lg:col-span-1"
                                            style={{
                                                background: 'rgba(241, 245, 249, 0.88)',
                                                border: '1px solid rgba(203, 213, 225, 0.95)',
                                            }}
                                        >
                                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Phone
                                            </dt>
                                            <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-900 sm:text-[13px]">
                                                <FiPhone className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                                                <span className="min-w-0 truncate">
                                                    {clientData.mobile
                                                        ? `+${clientData.country_code || '91'} ${clientData.mobile}`
                                                        : '—'}
                                                </span>
                                            </dd>
                                        </div>
                                        <div
                                            className="min-w-0 rounded-lg px-2.5 py-2 sm:col-span-2 lg:col-span-1"
                                            style={{
                                                background: 'rgba(240, 249, 255, 0.8)',
                                                border: '1px solid rgba(186, 230, 253, 0.9)',
                                            }}
                                        >
                                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                Email
                                            </dt>
                                            <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-900 sm:text-[13px]">
                                                <FiMail className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                                                <span className="min-w-0 truncate">{clientData.email || '—'}</span>
                                            </dd>
                                        </div>
                                    </dl>
                                </motion.section>


                                <motion.div
                                    className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="p-3 flex items-center justify-between">
                                        {tabsMinimized ? (
                                            // Minimized view - icons with labels in one line - CENTERED
                                            <>
                                                <div className="flex items-center justify-center gap-1 flex-1 flex-wrap">
                                                    {profileTabs.map((tabItem) => {
                                                        const Icon = tabItem.icon;
                                                        const isActive = tab === tabItem.id;
                                                        return (
                                                            <CompactTabIcon
                                                                key={tabItem.id}
                                                                to={tabItem.id}
                                                                icon={Icon}
                                                                label={tabItem.name}
                                                                isActive={isActive}
                                                                onClick={handleTabClick}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                <motion.button
                                                    onClick={toggleTabsMinimized}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 ml-1 flex-shrink-0"
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    title="Show full tabs"
                                                >
                                                    <FiMaximize2 className="w-4 h-4" />
                                                </motion.button>
                                            </>
                                        ) : (
                                            // Expanded view - grid layout with minimize button
                                            <>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 flex-1">
                                                    {profileTabs.map((tabItem) => {
                                                        const Icon = tabItem.icon;
                                                        const isActive = tab === tabItem.id;
                                                        return (
                                                            <TabLink
                                                                key={tabItem.id}
                                                                to={tabItem.id}
                                                                icon={Icon}
                                                                label={tabItem.name}
                                                                isActive={isActive}
                                                                onClick={handleTabClick}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                <motion.button
                                                    onClick={toggleTabsMinimized}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 ml-1 flex-shrink-0"
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    title="Minimize tabs"
                                                >
                                                    <FiMinimize2 className="w-4 h-4" />
                                                </motion.button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Tab content: full width of main column (no inner card — tabs supply their own layout) */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={tab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="w-full min-w-0 text-sm [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_h4]:text-sm [&_p]:text-xs [&_label]:text-xs [&_label]:font-medium [&_input]:text-sm [&_select]:text-sm [&_textarea]:text-sm [&_input]:rounded-md [&_select]:rounded-md [&_textarea]:rounded-md [&_input]:px-3 [&_select]:px-3 [&_textarea]:px-3 [&_input]:py-2 [&_select]:py-2 [&_textarea]:py-2 [&_button]:text-xs [&_button]:rounded-md [&_button]:px-3 [&_button]:py-1.5"
                                    >
                                        {renderTabContent()}
                                    </motion.div>
                                </AnimatePresence>
                            </>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Edit Modal - Keep for other tabs if needed */}
            <EditModal
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false, field: '', value: '' })}
                field={editModal.field}
                value={editModal.value}
                onSave={saveEdit}
            />
        </div>
    );
};

export default ClientProfile;