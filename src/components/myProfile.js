import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  FiCalendar,
  FiBriefcase,
  FiAward,
  FiFileText,
  FiMaximize2,
  FiMinimize2,
} from "react-icons/fi";
import { TbCurrencyRupee } from "react-icons/tb";
import { Sidebar, Header } from "./header";
import StateDistrictSelect from "./state-district-select";
import CustomSelect from "./CustomSelect";
import { optionByValue } from "../utils/customSelectHelpers";
import { DatePickerField } from "./PortalDatePicker";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import getAccountHeaders from "../utils/get-account-headers";
import { uploadOneSaasFileUrl } from "../utils/onesaas-upload";
import { useSubscription } from "../hooks/useSubscription";
import StaffAttendanceTab from "../staff/StaffAttendanceTab";
import ExpenseTab from "../staff/ExpenseTab";
import BonusFineTab from "../staff/BonusFineTab";
import SalaryTab from "../staff/SalaryTab";
import LedgerTab from "../staff/LedgerTab";
import LoanTab from "../staff/LoanTab";
import StaffPayslip from "../staff/StaffPayslip";

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

const BASE_TABS = [
  { id: "personal", label: "Personal", icon: FiUser },
  { id: "address", label: "Address", icon: FiMapPin },
];

const STAFF_SELF_TABS = [
  { id: "attendance", label: "Attendance", icon: FiCalendar },
  { id: "ledger", label: "Ledger", icon: TbCurrencyRupee },
  { id: "salary", label: "Salary", icon: FiBriefcase, subscriptionFeature: "salary-management" },
  { id: "expense", label: "Expenses", icon: TbCurrencyRupee },
  { id: "payslip", label: "Payslip", icon: FiFileText, subscriptionFeature: "salary-management" },
  { id: "bonus-fine", label: "Bonus/Fine", icon: FiAward },
  { id: "loan", label: "Loan", icon: TbCurrencyRupee },
];

function isBranchStaffRole() {
  if (typeof window === "undefined") return false;
  const branchId = localStorage.getItem("branch_id");
  if (!branchId || branchId === "null" || branchId === "undefined") return false;
  return String(localStorage.getItem("branch_role") || "").toLowerCase() === "staff";
}

function getSelfUsername() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("user_username") ||
    localStorage.getItem("username") ||
    ""
  );
}

const TabLink = ({ to, icon: Icon, label, isActive, onClick }) => (
  <motion.button
    type="button"
    onClick={() => onClick(to)}
    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200"
    }`}
    whileHover={{ scale: 1.03, y: -1 }}
    whileTap={{ scale: 0.98 }}
  >
    <motion.div
      animate={{
        rotate: isActive ? [0, 5, 0] : 0,
        scale: isActive ? 1.1 : 1,
      }}
      transition={{ duration: 0.2 }}
      className="mb-1"
    >
      <Icon className="w-4 h-4" />
    </motion.div>
    <span className="text-xs font-medium text-center leading-tight">{label}</span>
  </motion.button>
);

const CompactTabIcon = ({ to, icon: Icon, label, isActive, onClick }) => (
  <motion.button
    type="button"
    onClick={() => onClick(to)}
    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[70px] ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200"
    }`}
    whileHover={{ scale: 1.05, y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <Icon className="w-4 h-4 mb-1 mx-auto" />
    <span className="text-[10px] font-medium text-center leading-tight w-full">
      {label}
    </span>
  </motion.button>
);

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
  const { hasAccess } = useSubscription();
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
  const [isStaffSelf, setIsStaffSelf] = useState(() => isBranchStaffRole());
  const [selfUsername] = useState(() => getSelfUsername());
  const [staffData, setStaffData] = useState(null);
  const [staffDataError, setStaffDataError] = useState(null);
  const [staffDataLoading, setStaffDataLoading] = useState(false);
  const [tabsMinimized, setTabsMinimized] = useState(() => {
    try {
      const saved = localStorage.getItem("myProfileTabsMinimized");
      return saved != null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const imageInputRef = useRef(null);
  const otpRefs = useRef([...Array(6)].map(() => React.createRef()));

  const visibleTabs = useMemo(() => {
    if (!isStaffSelf) return BASE_TABS;
    const staffTabs = STAFF_SELF_TABS.filter(
      (tab) => !tab.subscriptionFeature || hasAccess(tab.subscriptionFeature),
    );
    return [...BASE_TABS, ...staffTabs];
  }, [isStaffSelf, hasAccess]);

  const refreshStaffGate = useCallback(() => {
    setIsStaffSelf(isBranchStaffRole());
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    localStorage.setItem("myProfileTabsMinimized", JSON.stringify(tabsMinimized));
  }, [tabsMinimized]);

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
    const onStorage = (event) => {
      if (
        !event.key ||
        event.key === "branch_id" ||
        event.key === "branch_role"
      ) {
        refreshStaffGate();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshStaffGate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshStaffGate);
    };
  }, [refreshStaffGate]);

  useEffect(() => {
    const allowed = new Set(visibleTabs.map((t) => t.id));
    if (!allowed.has(activeTab)) {
      setActiveTab("personal");
    }
    if (activeTab !== "personal" && activeTab !== "address" && isEditing) {
      setIsEditing(false);
      setDraft(profile);
    }
  }, [visibleTabs, activeTab, isEditing, profile]);

  useEffect(() => {
    if (!isStaffSelf || !selfUsername) {
      setStaffData(null);
      setStaffDataError(null);
      return undefined;
    }

    let cancelled = false;
    const loadStaffSelf = async () => {
      setStaffDataLoading(true);
      setStaffDataError(null);
      try {
        const headers = getHeaders();
        if (!headers) {
          throw new Error("Missing branch authentication.");
        }
        const response = await fetch(
          `${API_BASE_URL}/settings/staff/profile/${encodeURIComponent(selfUsername)}`,
          { method: "GET", headers },
        );
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("Unable to load your staff workspace profile.");
          }
          throw new Error(`Failed to load staff profile (${response.status})`);
        }
        const responseData = await response.json();
        const staffMember = responseData?.data?.[0];
        if (!responseData?.success || !staffMember) {
          throw new Error("No staff profile found for this branch.");
        }
        if (cancelled) return;
        const branchInfo = staffMember.branch || {};
        const formattedPhone = staffMember.mobile
          ? `${staffMember.country_code ? "+" + staffMember.country_code : ""} ${staffMember.mobile}`.trim()
          : "";
        setStaffData({
          firstName: staffMember.name?.split(" ")[0] || "",
          lastName: staffMember.name?.split(" ").slice(1).join(" ") || "",
          fullName: staffMember.name || "Unknown",
          email: staffMember.email || "",
          phone: formattedPhone,
          balance: "0.00",
          designation: staffMember.designation || "Not Assigned",
          username: staffMember.username || selfUsername,
          status: staffMember.status === true,
          country_code: staffMember.country_code,
          image: staffMember.image,
          branch: {
            id: branchInfo.id,
            name: branchInfo.name,
          },
        });
      } catch (error) {
        if (!cancelled) {
          setStaffData(null);
          setStaffDataError(error.message || "Failed to load staff profile");
        }
      } finally {
        if (!cancelled) setStaffDataLoading(false);
      }
    };

    loadStaffSelf();
    return () => {
      cancelled = true;
    };
  }, [isStaffSelf, selfUsername]);

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

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const toggleTabsMinimized = useCallback(() => {
    setTabsMinimized((prev) => !prev);
  }, []);

  const ProfileSkeleton = () => (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading profile">
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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: Math.min(visibleTabs.length || 4, 8) }).map((_, i) => (
            <div key={i} className="h-14 w-[70px] rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
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
                      {(activeTab === "personal" || activeTab === "address") &&
                      !isEditing ? (
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
                      ) : (activeTab === "personal" || activeTab === "address") &&
                        isEditing ? (
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
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between p-3">
                  {tabsMinimized ? (
                    <>
                      <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
                        {visibleTabs.map((tabItem) => {
                          const Icon = tabItem.icon;
                          const isActive = activeTab === tabItem.id;
                          return (
                            <CompactTabIcon
                              key={tabItem.id}
                              to={tabItem.id}
                              icon={Icon}
                              label={tabItem.label}
                              isActive={isActive}
                              onClick={handleTabChange}
                            />
                          );
                        })}
                      </div>
                      <motion.button
                        type="button"
                        onClick={toggleTabsMinimized}
                        className="ml-1 flex-shrink-0 rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Show full tabs"
                      >
                        <FiMaximize2 className="h-4 w-4" />
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {visibleTabs.map((tabItem) => {
                          const Icon = tabItem.icon;
                          const isActive = activeTab === tabItem.id;
                          return (
                            <TabLink
                              key={tabItem.id}
                              to={tabItem.id}
                              icon={Icon}
                              label={tabItem.label}
                              isActive={isActive}
                              onClick={handleTabChange}
                            />
                          );
                        })}
                      </div>
                      <motion.button
                        type="button"
                        onClick={toggleTabsMinimized}
                        className="ml-1 flex-shrink-0 rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Minimize tabs"
                      >
                        <FiMinimize2 className="h-4 w-4" />
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full min-w-0 text-sm [&_h2]:text-lg"
                >
                  {(activeTab === "personal" || activeTab === "address") ? (
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
                  ) : (
                  <div className="min-w-0 space-y-3">
                    {staffDataLoading ? (
                      <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">
                        Loading your staff workspace…
                      </div>
                    ) : null}
                    {staffDataError ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {staffDataError}
                      </div>
                    ) : null}
                    {activeTab === "attendance" ? (
                      <StaffAttendanceTab
                        username={selfUsername}
                        staffName={staffData?.fullName}
                        staffData={staffData}
                        readOnly
                      />
                    ) : null}
                    {activeTab === "ledger" ? (
                      <LedgerTab
                        username={selfUsername}
                        staffData={staffData}
                        staffName={staffData?.fullName}
                        staffEmail={staffData?.email}
                        staffMobile={staffData?.phone}
                        staffCountryCode={staffData?.country_code || "91"}
                        readOnly
                      />
                    ) : null}
                    {activeTab === "salary" ? (
                      <SalaryTab
                        username={selfUsername}
                        staffName={staffData?.fullName}
                        readOnly
                      />
                    ) : null}
                    {activeTab === "expense" ? (
                      <ExpenseTab
                        staffUsername={selfUsername}
                        readOnly
                      />
                    ) : null}
                    {activeTab === "payslip" ? (
                      <StaffPayslip
                        username={selfUsername}
                        staffName={staffData?.fullName}
                        readOnly
                      />
                    ) : null}
                    {activeTab === "bonus-fine" ? (
                      <BonusFineTab
                        username={selfUsername}
                        readOnly
                      />
                    ) : null}
                    {activeTab === "loan" ? (
                      <LoanTab username={selfUsername} readOnly />
                    ) : null}
                  </div>
                  )}
                </motion.div>
              </AnimatePresence>
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
