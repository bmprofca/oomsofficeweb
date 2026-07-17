import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiEdit2,
  FiSave,
  FiX,
  FiCamera,
  FiRefreshCw,
} from "react-icons/fi";
import { Sidebar, Header } from "./header";
import StateDistrictSelect from "./state-district-select";
import CustomSelect from "./CustomSelect";
import { optionByValue } from "../utils/customSelectHelpers";
import { DatePickerField } from "./PortalDatePicker";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import getAccountHeaders from "../utils/get-account-headers";
import { uploadOneSaasFileUrl } from "../utils/onesaas-upload";

const EMPTY_PROFILE = {
  profile_id: "",
  username: "",
  user_type: "",
  name: "",
  care_of: "",
  guardian_name: "",
  date_of_birth: "",
  gender: "",
  country_code: "+91",
  mobile: "",
  email: "",
  pan_number: "",
  country: "India",
  state: "",
  city: "",
  district: "",
  village_town: "",
  address_line_1: "",
  address_line_2: "",
  pincode: "",
  image: "",
  create_date: null,
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const TABS = [
  { id: "personal", label: "Personal", icon: FiUser },
  { id: "address", label: "Address", icon: FiMapPin },
];

const inputClass =
  "w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg placeholder:text-gray-400 outline-none transition hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500";

function formatDisplayDate(value) {
  if (!value) return "—";
  try {
    const iso = String(value).slice(0, 10);
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return String(value);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function locationLabel(profile) {
  return [profile.city || profile.district, profile.state, profile.country]
    .filter(Boolean)
    .join(", ") || "—";
}

function normalizeEmail(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed.toLowerCase() : "";
}

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function mapApiToForm(data = {}) {
  return {
    ...EMPTY_PROFILE,
    profile_id: data.profile_id || "",
    username: data.username || "",
    user_type: data.user_type || "",
    name: data.name || "",
    care_of: data.care_of || "",
    guardian_name: data.guardian_name || "",
    date_of_birth: data.date_of_birth
      ? String(data.date_of_birth).slice(0, 10)
      : "",
    gender: data.gender || "",
    country_code: data.country_code || "+91",
    mobile: data.mobile ? String(data.mobile) : "",
    email: data.email || "",
    pan_number: data.pan_number || "",
    country: data.country || "India",
    state: data.state || "",
    city: data.city || data.district || "",
    district: data.district || data.city || "",
    village_town: data.village_town || "",
    address_line_1: data.address_line_1 || "",
    address_line_2: data.address_line_2 || "",
    pincode: data.pincode ? String(data.pincode) : "",
    image: data.image || "",
    create_date: data.create_date || null,
  };
}

function detectContactChange(current, draft) {
  const emailChanged =
    normalizeEmail(current.email) !== normalizeEmail(draft.email);
  const mobileChanged =
    normalizeMobile(current.mobile) !== normalizeMobile(draft.mobile);

  if (emailChanged && mobileChanged) return "both";
  if (emailChanged) return "email";
  if (mobileChanged) return "mobile";
  return null;
}

function buildProfilePayload(draft) {
  return {
    name: draft.name.trim(),
    care_of: draft.care_of || null,
    guardian_name: draft.guardian_name || null,
    date_of_birth: draft.date_of_birth || null,
    gender: draft.gender || null,
    mobile: draft.mobile || null,
    email: draft.email || null,
    pan_number: draft.pan_number || null,
    country: draft.country || "India",
    state: draft.state || null,
    city: draft.city || null,
    district: draft.district || draft.city || null,
    village_town: draft.village_town || null,
    address_line_1: draft.address_line_1 || null,
    address_line_2: draft.address_line_2 || null,
    pincode: draft.pincode || null,
  };
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-gray-600">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function ReadOnlyValue({ value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
      {value || "—"}
    </div>
  );
}

export default function MyProfile() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("sidebarMinimized")
        : null;
    return saved ? JSON.parse(saved) : false;
  });
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [careOfOptions, setCareOfOptions] = useState([]);
  const [otpModal, setOtpModal] = useState(null);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpDestination, setOtpDestination] = useState("");
  const imageInputRef = useRef(null);
  const otpRefs = useRef([...Array(6)].map(() => React.createRef()));

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    fetchProfile();
    fetchCareOfTypes();
  }, []);

  useEffect(() => {
    if (otpModal?.open) {
      sendContactOtp(otpModal.field);
      setTimeout(() => otpRefs.current[0]?.current?.focus(), 100);
    }
  }, [otpModal?.open, otpModal?.field]);

  const display = isEditing ? draft : profile;

  const fetchCareOfTypes = async () => {
    const headers = getHeaders();
    if (!headers) return;

    try {
      const response = await fetch(`${API_BASE_URL}/utils/care-of-types`, {
        method: "GET",
        headers,
      });
      const json = await response.json();
      if (response.ok && json?.success && Array.isArray(json.data)) {
        setCareOfOptions(
          json.data.map((value) => ({ value, label: value })),
        );
      }
    } catch (error) {
      console.error("Care-of types fetch error:", error);
    }
  };

  const fetchProfile = async () => {
    const headers = getAccountHeaders();
    if (!headers) {
      setLoading(false);
      toast.error("Missing authentication. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/account/profile`, {
        method: "GET",
        headers,
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Request failed (${response.status})`);
      }
      const mapped = mapApiToForm(json.data || {});
      setProfile(mapped);
      setDraft(mapped);
    } catch (error) {
      console.error("Profile fetch error:", error);
      toast.error(error?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const setDraftField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = () => {
    setDraft({ ...profile });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft({ ...profile });
    setIsEditing(false);
  };

  const saveProfile = async (contactOtp = null) => {
    const headers = getAccountHeaders();
    if (!headers) {
      toast.error("Missing authentication. Please sign in again.");
      return false;
    }

    if (!String(draft.name || "").trim()) {
      toast.error("Name is required");
      return false;
    }

    setSaving(true);
    try {
      const payload = buildProfilePayload(draft);
      if (contactOtp) {
        payload.contact_otp = contactOtp;
      }

      const response = await fetch(`${API_BASE_URL}/account/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        if (json?.requires_otp) {
          setOtpModal({ open: true, field: json.field || detectContactChange(profile, draft) });
          throw new Error(json?.message || "OTP verification required");
        }
        throw new Error(json?.message || `Update failed (${response.status})`);
      }

      const mapped = mapApiToForm(json.data || {});
      setProfile(mapped);
      setDraft(mapped);
      setIsEditing(false);
      setOtpModal(null);
      setOtpDigits(["", "", "", "", "", ""]);
      toast.success(json?.message || "Profile updated successfully");

      if (mapped.email) localStorage.setItem("user_email", mapped.email);
      if (mapped.mobile) localStorage.setItem("user_mobile", mapped.mobile);
      if (mapped.name) localStorage.setItem("user_name", mapped.name);

      return true;
    } catch (error) {
      console.error("Profile update error:", error);
      if (!error?.message?.includes("OTP verification required")) {
        toast.error(error?.message || "Failed to update profile");
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const contactField = detectContactChange(profile, draft);
    if (contactField) {
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpModal({ open: true, field: contactField });
      return;
    }
    await saveProfile();
  };

  const sendContactOtp = async (field) => {
    const headers = getAccountHeaders();
    if (!headers || !field) return;

    setOtpSending(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/account/profile/contact/send-otp`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ field }),
        },
      );
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Failed to send OTP");
      }
      setOtpDestination(json.destination_masked || "");
      toast.success(json.message || "OTP sent");
    } catch (error) {
      console.error("Send contact OTP error:", error);
      toast.error(error?.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value.slice(-1);
    setOtpDigits(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.current?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const next = [...otpDigits];
        next[index - 1] = "";
        setOtpDigits(next);
        otpRefs.current[index - 1]?.current?.focus();
      } else if (otpDigits[index]) {
        const next = [...otpDigits];
        next[index] = "";
        setOtpDigits(next);
      }
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const paste = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;
    const next = paste.split("").concat(Array(6).fill("")).slice(0, 6);
    setOtpDigits(next);
    otpRefs.current[Math.min(paste.length, 5)]?.current?.focus();
  };

  const handleOtpVerifyAndSave = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }

    const headers = getAccountHeaders();
    if (!headers || !otpModal?.field) return;

    setOtpVerifying(true);
    try {
      const verifyResponse = await fetch(
        `${API_BASE_URL}/account/profile/contact/verify-otp`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ field: otpModal.field, otp }),
        },
      );
      const verifyJson = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyJson?.success) {
        throw new Error(verifyJson?.message || "Invalid OTP");
      }

      await saveProfile(otp);
    } catch (error) {
      console.error("Verify contact OTP error:", error);
      toast.error(error?.message || "OTP verification failed");
    } finally {
      setOtpVerifying(false);
    }
  };

  const closeOtpModal = () => {
    setOtpModal(null);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpDestination("");
  };

  const otpChannelLabel =
    otpModal?.field === "mobile"
      ? "registered email"
      : "registered mobile number";

  const handleImagePick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("Please select an image file");
      event.target.value = "";
      return;
    }

    const headers = getAccountHeaders();
    if (!headers) {
      toast.error("Missing authentication. Please sign in again.");
      return;
    }

    setImageUploading(true);
    try {
      const publicUrl = await uploadOneSaasFileUrl(file);
      if (!publicUrl) throw new Error("Uploaded image URL not found");

      const response = await fetch(`${API_BASE_URL}/account/profile/image`, {
        method: "POST",
        headers,
        body: JSON.stringify({ image: publicUrl }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Upload failed (${response.status})`);
      }

      const mapped = mapApiToForm(json.data || {});
      setProfile(mapped);
      setDraft((prev) => ({ ...prev, image: mapped.image }));
      toast.success(json?.message || "Profile image updated");
    } catch (error) {
      console.error("Profile image upload error:", error);
      toast.error(error?.message || "Failed to update profile image");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const initials = String(display.name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

  const ProfileSkeleton = () => (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading profile">
      {/* Header card */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
          <div className="h-24 w-24 shrink-0 rounded-full bg-gray-200 ring-4 ring-white" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-7 w-48 max-w-full rounded-md bg-gray-200" />
            <div className="space-y-2">
              <div className="h-4 w-56 max-w-full rounded bg-gray-100" />
              <div className="h-4 w-40 max-w-full rounded bg-gray-100" />
              <div className="h-4 w-52 max-w-full rounded bg-gray-100" />
            </div>
          </div>
          <div className="h-10 w-full rounded-lg bg-gray-200 md:w-32" />
        </div>
      </div>

      {/* Tabs + content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
            <div className="h-11 rounded-lg bg-indigo-100/80" />
            <div className="h-11 rounded-lg bg-gray-100" />
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 space-y-2">
              <div className="h-6 w-44 rounded-md bg-gray-200" />
              <div className="h-4 w-64 max-w-full rounded bg-gray-100" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-gray-100" />
                  <div className="h-10 w-full rounded-lg bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 pb-6 pt-3 md:pt-4">
          {loading ? (
            <ProfileSkeleton />
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
                  <div className="relative shrink-0">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700 ring-4 ring-white">
                      {display.image ? (
                        <img
                          src={display.image}
                          alt={display.name || "Profile"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials || "U"
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={imageUploading}
                      onClick={() => imageInputRef.current?.click()}
                      className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
                      title="Change photo"
                    >
                      <FiCamera className="h-3.5 w-3.5" />
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImagePick}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-bold text-gray-900">
                      {display.name || "My Profile"}
                    </h1>
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FiMail className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate">{display.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiPhone className="h-4 w-4 shrink-0 text-gray-400" />
                        <span>{display.mobile || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiMapPin className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate">{locationLabel(display)}</span>
                      </div>
                    </div>
                    {imageUploading ? (
                      <p className="mt-2 text-xs text-indigo-600">
                        Uploading photo…
                      </p>
                    ) : null}
                  </div>

                  <div className="w-full shrink-0 md:w-auto">
                    <AnimatePresence mode="wait">
                      {!isEditing ? (
                        <motion.button
                          key="edit"
                          type="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={handleEdit}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 md:w-auto"
                        >
                          <FiEdit2 className="h-4 w-4" />
                          Edit profile
                        </motion.button>
                      ) : (
                        <motion.div
                          key="actions"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex gap-2"
                        >
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleSave}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 md:flex-none"
                          >
                            <FiSave className="h-4 w-4" />
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleCancel}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 md:flex-none"
                          >
                            <FiX className="h-4 w-4" />
                            Cancel
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                <div className="lg:col-span-1">
                  <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${active
                            ? "bg-indigo-600 text-white"
                            : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                            }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                    {activeTab === "personal" && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">
                            Personal information
                          </h2>
                          <p className="mt-0.5 text-sm text-gray-500">
                            Details stored on your account profile
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Full name" required>
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.name}
                                onChange={(e) =>
                                  setDraftField("name", e.target.value)
                                }
                                className={inputClass}
                                placeholder="Your full name"
                              />
                            ) : (
                              <ReadOnlyValue value={profile.name} />
                            )}
                          </Field>

                          <Field label="Email">
                            {isEditing ? (
                              <input
                                type="email"
                                value={draft.email}
                                onChange={(e) =>
                                  setDraftField("email", e.target.value)
                                }
                                className={inputClass}
                                placeholder="you@example.com"
                              />
                            ) : (
                              <ReadOnlyValue value={profile.email} />
                            )}
                          </Field>

                          <Field label="Mobile">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.mobile}
                                onChange={(e) =>
                                  setDraftField(
                                    "mobile",
                                    e.target.value.replace(/\D/g, "").slice(0, 10),
                                  )
                                }
                                className={inputClass}
                                placeholder="10-digit mobile"
                                maxLength={10}
                              />
                            ) : (
                              <ReadOnlyValue value={profile.mobile} />
                            )}
                          </Field>

                          <Field label="Gender">
                            {isEditing ? (
                              <CustomSelect
                                options={GENDER_OPTIONS}
                                value={optionByValue(
                                  GENDER_OPTIONS,
                                  draft.gender,
                                )}
                                onChange={(opt) =>
                                  setDraftField("gender", opt?.value || "")
                                }
                                placeholder="Select gender"
                                isClearable
                              />
                            ) : (
                              <ReadOnlyValue
                                value={
                                  profile.gender
                                    ? profile.gender.charAt(0).toUpperCase() +
                                    profile.gender.slice(1)
                                    : ""
                                }
                              />
                            )}
                          </Field>

                          <Field label="Date of birth">
                            {isEditing ? (
                              <DatePickerField
                                value={draft.date_of_birth || ""}
                                onChange={(value) =>
                                  setDraftField("date_of_birth", value || "")
                                }
                                placeholder="Select date of birth"
                                mode="single"
                                initialTab="single"
                                hideTabs
                                showResetButton
                                buttonClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <ReadOnlyValue
                                value={formatDisplayDate(profile.date_of_birth)}
                              />
                            )}
                          </Field>

                          <Field label="PAN">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.pan_number}
                                onChange={(e) =>
                                  setDraftField(
                                    "pan_number",
                                    e.target.value.toUpperCase().slice(0, 10),
                                  )
                                }
                                className={inputClass}
                                placeholder="ABCDE1234F"
                                maxLength={10}
                              />
                            ) : (
                              <ReadOnlyValue value={profile.pan_number} />
                            )}
                          </Field>

                          <Field label="Care of">
                            {isEditing ? (
                              <CustomSelect
                                options={careOfOptions}
                                value={optionByValue(
                                  careOfOptions,
                                  draft.care_of,
                                )}
                                onChange={(opt) =>
                                  setDraftField("care_of", opt?.value || "")
                                }
                                placeholder="Select care of"
                                isClearable
                              />
                            ) : (
                              <ReadOnlyValue value={profile.care_of} />
                            )}
                          </Field>

                          <Field label="Guardian name">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.guardian_name}
                                onChange={(e) =>
                                  setDraftField(
                                    "guardian_name",
                                    e.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="Guardian name"
                              />
                            ) : (
                              <ReadOnlyValue value={profile.guardian_name} />
                            )}
                          </Field>
                        </div>
                      </div>
                    )}

                    {activeTab === "address" && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">
                            Address
                          </h2>
                          <p className="mt-0.5 text-sm text-gray-500">
                            Postal address linked to your profile
                          </p>
                        </div>

                        <div className="space-y-4">
                          <Field label="Address line 1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.address_line_1}
                                onChange={(e) =>
                                  setDraftField(
                                    "address_line_1",
                                    e.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="Street, building, area"
                              />
                            ) : (
                              <ReadOnlyValue value={profile.address_line_1} />
                            )}
                          </Field>

                          <Field label="Address line 2">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.address_line_2}
                                onChange={(e) =>
                                  setDraftField(
                                    "address_line_2",
                                    e.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="Landmark, floor (optional)"
                              />
                            ) : (
                              <ReadOnlyValue value={profile.address_line_2} />
                            )}
                          </Field>

                          <Field label="Village / town">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.village_town}
                                onChange={(e) =>
                                  setDraftField(
                                    "village_town",
                                    e.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="Village or town"
                              />
                            ) : (
                              <ReadOnlyValue value={profile.village_town} />
                            )}
                          </Field>

                          {isEditing ? (
                            <StateDistrictSelect
                              selectedState={draft.state}
                              selectedDistrict={draft.city}
                              required={false}
                              onStateChange={(value) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  state: value,
                                  city: "",
                                  district: "",
                                }))
                              }
                              onDistrictChange={(value) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  city: value,
                                  district: value,
                                }))
                              }
                            />
                          ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                              <Field label="State">
                                <ReadOnlyValue value={profile.state} />
                              </Field>
                              <Field label="City / district">
                                <ReadOnlyValue
                                  value={profile.city || profile.district}
                                />
                              </Field>
                            </div>
                          )}

                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Pincode">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={draft.pincode}
                                  onChange={(e) =>
                                    setDraftField(
                                      "pincode",
                                      e.target.value.replace(/\D/g, "").slice(0, 6),
                                    )
                                  }
                                  className={inputClass}
                                  placeholder="6-digit pincode"
                                  maxLength={6}
                                />
                              ) : (
                                <ReadOnlyValue value={profile.pincode} />
                              )}
                            </Field>
                            <Field label="Country">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={draft.country || "India"}
                                  className={inputClass}
                                  disabled
                                  readOnly
                                />
                              ) : (
                                <ReadOnlyValue
                                  value={profile.country || "India"}
                                />
                              )}
                            </Field>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <AnimatePresence>
        {otpModal?.open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={closeOtpModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Verify contact change
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {otpSending
                      ? "Sending OTP…"
                      : `Enter the 6-digit code sent to your ${otpChannelLabel}${otpDestination ? ` (${otpDestination})` : ""
                      }`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeOtpModal}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs.current[index]}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-center text-lg font-bold text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    maxLength={1}
                    inputMode="numeric"
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <button
                  type="button"
                  disabled={otpSending}
                  onClick={() => sendContactOtp(otpModal.field)}
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  <FiRefreshCw
                    className={`h-3.5 w-3.5 ${otpSending ? "animate-spin" : ""}`}
                  />
                  Resend OTP
                </button>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  disabled={otpVerifying || saving}
                  onClick={handleOtpVerifyAndSave}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {otpVerifying || saving ? "Verifying…" : "Verify & save"}
                </button>
                <button
                  type="button"
                  disabled={otpVerifying || saving}
                  onClick={closeOtpModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
