import React, { useState, useEffect, useRef } from "react";
import {
  FiFileText,
  FiImage,
  FiEdit3,
  FiMapPin,
  FiPhone,
  FiMail,
  FiShield,
  FiUploadCloud,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiBriefcase,
  FiSave,
  FiInfo,
  FiHash,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Header, Sidebar } from "../../components/header";
import StateDistrictSelect from "../../components/state-district-select";
import API_BASE_URL from "../../utils/api-controller";
import getHeaders from "../../utils/get-headers";
import { uploadOneSaasFileUrl } from "../../utils/onesaas-upload";

const TABS = [
  { id: "details", label: "Details", icon: FiBriefcase, tone: "indigo" },
  { id: "logo", label: "Logo", icon: FiImage, tone: "violet" },
  { id: "signature", label: "Signature", icon: FiEdit3, tone: "sky" },
  { id: "invoice", label: "Invoice", icon: FiFileText, tone: "emerald" },
];

const TONE = {
  indigo: {
    soft: "bg-indigo-50 text-indigo-600",
    ring: "ring-indigo-100",
    activeTab: "bg-indigo-600 text-white",
    border: "border-indigo-100",
    drop: "border-indigo-400 bg-indigo-50",
  },
  violet: {
    soft: "bg-violet-50 text-violet-600",
    ring: "ring-violet-100",
    activeTab: "bg-violet-600 text-white",
    border: "border-violet-100",
    drop: "border-violet-400 bg-violet-50",
  },
  sky: {
    soft: "bg-sky-50 text-sky-600",
    ring: "ring-sky-100",
    activeTab: "bg-sky-600 text-white",
    border: "border-sky-100",
    drop: "border-sky-400 bg-sky-50",
  },
  emerald: {
    soft: "bg-emerald-50 text-emerald-600",
    ring: "ring-emerald-100",
    activeTab: "bg-emerald-600 text-white",
    border: "border-emerald-100",
    drop: "border-emerald-400 bg-emerald-50",
  },
  teal: {
    soft: "bg-teal-50 text-teal-600",
    ring: "ring-teal-100",
  },
  amber: {
    soft: "bg-amber-50 text-amber-600",
    ring: "ring-amber-100",
  },
  gray: {
    soft: "bg-gray-100 text-gray-600",
    ring: "ring-gray-100",
  },
};

const inputClass =
  "w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg placeholder:text-gray-400 outline-none transition duration-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";

const inputWithIconClass =
  "w-full py-2 pl-10 pr-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg placeholder:text-gray-400 outline-none transition duration-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";

const textareaClass =
  "w-full min-h-[72px] px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg placeholder:text-gray-400 outline-none transition duration-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 resize-y";

const Field = ({ label, required, children, hint }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
      {label}
      {required ? <span className="ml-0.5 text-red-500">*</span> : null}
    </label>
    {children}
    {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
  </div>
);

const IconBox = ({ icon: Icon, tone = "gray" }) => {
  const tones = TONE[tone] || TONE.gray;
  return (
    <div
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones.soft} ring-1 ${tones.ring}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
};

const SectionCard = ({ icon, tone = "gray", title, hint, children, className = "" }) => (
  <section
    className={`overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
  >
    <div className="flex items-start gap-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2.5 md:px-4">
      <IconBox icon={icon} tone={tone} />
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
      </div>
    </div>
    <div className="space-y-3 p-3 md:p-4">{children}</div>
  </section>
);

const StatusBadge = ({ verified, label }) => (
  <span
    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
      verified
        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border border-amber-200 bg-amber-50 text-amber-700"
    }`}
  >
    {verified ? (
      <FiCheckCircle className="h-3 w-3" />
    ) : (
      <FiAlertCircle className="h-3 w-3" />
    )}
    {label}
  </span>
);

const Tip = ({ children }) => (
  <div className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
    <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    <div>{children}</div>
  </div>
);

const PrimaryButton = ({
  children,
  disabled,
  type = "button",
  className = "",
  icon: Icon,
}) => (
  <button
    type={type}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
    {children}
  </button>
);

const SecondaryButton = ({ children, onClick, className = "", icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 ${className}`}
  >
    {Icon ? <Icon className="h-3 w-3" /> : null}
    {children}
  </button>
);

const BranchSettings = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(true);

  const [branchSettings, setBranchSettings] = useState({
    name: "",
    legal_name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    mobile_1: "",
    mobile_2: "",
    email_1: "",
    email_2: "",
    pan: "",
    gst_number: "",
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    address: "",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [signFile, setSignFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [signUrl, setSignUrl] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [signPreviewUrl, setSignPreviewUrl] = useState("");
  const [panVerified, setPanVerified] = useState(null);
  const [gstVerified, setGstVerified] = useState(null);
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [isSignDragging, setIsSignDragging] = useState(false);
  const logoInputRef = useRef(null);
  const signInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("details");
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [signUploading, setSignUploading] = useState(false);
  const [logoPublicUrl, setLogoPublicUrl] = useState("");
  const [signPublicUrl, setSignPublicUrl] = useState("");

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      if (signPreviewUrl) URL.revokeObjectURL(signPreviewUrl);
    };
  }, [logoPreviewUrl, signPreviewUrl]);

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
    fetchSettingsData();
  }, []);

  const applyBranchDetailsData = (data = {}) => {
    const basic = data?.basic || {};
    const address = basic?.address || {};
    const mobile = basic?.mobile || {};
    const email = basic?.email || {};
    const gst = basic?.gst || {};
    const image = data?.image || {};
    const invoice = data?.invoice || {};

    setBranchSettings((prev) => ({
      ...prev,
      name: basic?.name || "",
      legal_name: basic?.legal_name || "",
      address_line_1: address?.address_line_1 || "",
      address_line_2: address?.address_line_2 || "",
      city: address?.city || "",
      state: address?.state || "",
      pincode: address?.pincode ? String(address.pincode) : "",
      country: address?.country || "India",
      mobile_1: mobile?.mobile_1 ? String(mobile.mobile_1) : "",
      mobile_2: mobile?.mobile_2 ? String(mobile.mobile_2) : "",
      email_1: email?.email_1 || "",
      email_2: email?.email_2 || "",
      pan: basic?.pan?.pan || "",
      gst_number: gst?.gst || "",
    }));

    setInvoiceSettings((prev) => ({
      ...prev,
      address: invoice?.address || prev.address,
    }));

    setLogoUrl(image?.logo || "");
    setSignUrl(image?.sign || "");
    setLogoPublicUrl("");
    setSignPublicUrl("");
    setPanVerified(Boolean(basic?.pan?.is_pan_verified));
    setGstVerified(Boolean(gst?.is_gst_verified));
  };

  const fetchSettingsData = async () => {
    const headers = getHeaders();
    if (!headers) {
      setLoading(false);
      toast.error("Missing authentication. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/settings/branch/details`, {
        method: "GET",
        headers,
      });

      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Request failed (${response.status})`);
      }
      applyBranchDetailsData(json?.data || {});
    } catch (error) {
      console.error("Branch details fetch error:", error);
      toast.error(error?.message || "Failed to load branch settings");
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSettingsChange = (field, value) => {
    if (field === "pan" && panVerified) return;
    if (field === "gst_number" && gstVerified) return;

    if (field === "state") {
      setBranchSettings((prev) => ({
        ...prev,
        state: value,
        city: "",
      }));
      return;
    }

    setBranchSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInvoiceSettingsChange = (field, value) => {
    setInvoiceSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processImageSelection(selectedFile, "logo");
  };

  const handleSignFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processImageSelection(selectedFile, "sign");
  };

  const clearSelectedFile = (type) => {
    if (type === "logo") {
      setLogoFile(null);
      setLogoPublicUrl("");
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl("");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }
    setSignFile(null);
    setSignPublicUrl("");
    if (signPreviewUrl) URL.revokeObjectURL(signPreviewUrl);
    setSignPreviewUrl("");
    if (signInputRef.current) signInputRef.current.value = "";
  };

  const handleBranchSettingsSubmit = async (e) => {
    e.preventDefault();
    const headers = getHeaders();
    if (!headers) {
      toast.error("Missing authentication. Please sign in again.");
      return;
    }

    setDetailsSaving(true);
    try {
      const payload = {
        name: branchSettings.name,
        legal_name: branchSettings.legal_name,
        address: {
          address_line_1: branchSettings.address_line_1,
          address_line_2: branchSettings.address_line_2,
          city: branchSettings.city,
          state: branchSettings.state,
          pincode: branchSettings.pincode,
          country: "India",
        },
        mobile: {
          mobile_1: branchSettings.mobile_1,
          mobile_2: branchSettings.mobile_2,
        },
        email: {
          email_1: branchSettings.email_1,
          email_2: branchSettings.email_2,
        },
      };

      if (!panVerified) payload.pan = { pan: branchSettings.pan };
      if (!gstVerified) payload.gst = { gst: branchSettings.gst_number };

      const response = await fetch(`${API_BASE_URL}/settings/branch/details`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Update failed (${response.status})`);
      }

      applyBranchDetailsData(json?.data || {});
      toast.success(json?.message || "Branch details updated successfully!");
    } catch (error) {
      console.error("Branch details update error:", error);
      toast.error(error?.message || "Failed to update branch details");
    } finally {
      setDetailsSaving(false);
    }
  };

  const handleInvoiceSettingsSubmit = async (e) => {
    e.preventDefault();
    const headers = getHeaders();
    if (!headers) {
      toast.error("Missing authentication. Please sign in again.");
      return;
    }

    setInvoiceSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/branch/invoice-address`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address: invoiceSettings.address }),
        },
      );

      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Update failed (${response.status})`);
      }

      if (
        json?.data &&
        Object.prototype.hasOwnProperty.call(json.data, "address")
      ) {
        setInvoiceSettings((prev) => ({
          ...prev,
          address: json.data.address ?? "",
        }));
      }
      toast.success(
        json?.message || "Branch invoice address updated successfully!",
      );
    } catch (error) {
      console.error("Invoice address update error:", error);
      toast.error(error?.message || "Failed to update invoice address");
    } finally {
      setInvoiceSaving(false);
    }
  };

  const processImageSelection = async (file, type) => {
    if (!file.type?.startsWith("image/")) {
      toast.error(
        `Please select a valid image file for ${type === "logo" ? "logo" : "signature"}.`,
      );
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (type === "logo") {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoFile(file);
      setLogoPreviewUrl(objectUrl);
      setLogoUploading(true);
      try {
        const uploadedUrl = await uploadOneSaasFileUrl(file);
        if (!uploadedUrl) throw new Error("Uploaded logo URL not found");
        setLogoPublicUrl(uploadedUrl);
        toast.success("Logo ready. Click save to apply.");
      } catch (error) {
        console.error("Logo pre-upload error:", error);
        setLogoPublicUrl("");
        toast.error(error?.message || "Failed to upload logo file");
      } finally {
        setLogoUploading(false);
      }
      return;
    }

    if (signPreviewUrl) URL.revokeObjectURL(signPreviewUrl);
    setSignFile(file);
    setSignPreviewUrl(objectUrl);
    setSignUploading(true);
    try {
      const uploadedUrl = await uploadOneSaasFileUrl(file);
      if (!uploadedUrl) throw new Error("Uploaded signature URL not found");
      setSignPublicUrl(uploadedUrl);
      toast.success("Signature ready. Click save to apply.");
    } catch (error) {
      console.error("Signature pre-upload error:", error);
      setSignPublicUrl("");
      toast.error(error?.message || "Failed to upload signature file");
    } finally {
      setSignUploading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    e.preventDefault();
    if (!logoPublicUrl) {
      toast.error("Please select and upload a logo image first.");
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      toast.error("Missing authentication. Please sign in again.");
      return;
    }

    setLogoUploading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/settings/branch/logo`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logo: logoPublicUrl }),
      });

      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(
          json?.message || `Logo update failed (${response.status})`,
        );
      }

      setLogoUrl(json?.data?.logo || logoPublicUrl);
      setLogoPublicUrl("");
      clearSelectedFile("logo");
      toast.success(json?.message || "Branch logo updated successfully!");
    } catch (error) {
      console.error("Logo upload/update error:", error);
      toast.error(error?.message || "Failed to upload logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSignUpload = async (e) => {
    e.preventDefault();
    if (!signPublicUrl) {
      toast.error("Please select and upload a signature image first.");
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      toast.error("Missing authentication. Please sign in again.");
      return;
    }

    setSignUploading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/settings/branch/sign`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sign: signPublicUrl }),
      });

      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(
          json?.message || `Signature update failed (${response.status})`,
        );
      }

      setSignUrl(json?.data?.sign || signPublicUrl);
      setSignPublicUrl("");
      clearSelectedFile("sign");
      toast.success(json?.message || "Branch sign updated successfully!");
    } catch (error) {
      console.error("Signature upload/update error:", error);
      toast.error(error?.message || "Failed to upload signature");
    } finally {
      setSignUploading(false);
    }
  };

  const handleLogoDrop = (e) => {
    e.preventDefault();
    setIsLogoDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) processImageSelection(droppedFile, "logo");
  };

  const handleSignDrop = (e) => {
    e.preventDefault();
    setIsSignDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) processImageSelection(droppedFile, "sign");
  };

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

  const renderShell = (children) => (
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
      <div className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}>
        <div className="mx-2 sm:mx-4 md:mx-8 pb-6 pt-3 md:pt-4">
          {children}
        </div>
      </div>
    </div>
  );

  const renderMediaUploader = ({
    kind,
    currentUrl,
    previewUrl,
    file,
    publicUrl,
    uploading,
    dragging,
    setDragging,
    inputRef,
    onDrop,
    onFileChange,
    onSubmit,
    title,
    hint,
    emptyIcon: EmptyIcon,
    tone = "indigo",
  }) => {
    const tones = TONE[tone] || TONE.indigo;
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[140px_minmax(0,1fr)]">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Current {kind}
            </p>
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white">
              {currentUrl ? (
                <img
                  src={currentUrl}
                  alt={`Current ${kind}`}
                  className="max-h-16 max-w-full object-contain p-1.5"
                />
              ) : (
                <div className="px-2 text-center text-gray-400">
                  <EmptyIcon className="mx-auto h-4 w-4" />
                  <p className="mt-1 text-xs">No {kind} yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`rounded-lg border-2 border-dashed px-3 py-3 text-center transition duration-200 ${
                dragging
                  ? tones.drop
                  : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
              }`}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Selected ${kind} preview`}
                  className="mx-auto h-12 max-w-full object-contain"
                />
              ) : (
                <div
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${tones.soft}`}
                >
                  <FiUploadCloud className="h-4 w-4" />
                </div>
              )}
              <p className="mt-1.5 text-sm font-semibold text-gray-800">
                {previewUrl ? "New file selected" : "Drag & drop your file here"}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                or click to browse · PNG, JPG, WEBP · max 5MB
              </p>
              {file ? (
                <p className="mt-1.5 truncate text-xs font-medium text-gray-600">
                  {file.name}
                </p>
              ) : null}
              {publicUrl ? (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <FiCheckCircle className="h-3 w-3" />
                  Ready to save
                </p>
              ) : null}
            </div>
            <input
              ref={inputRef}
              type="file"
              onChange={onFileChange}
              className="hidden"
              accept="image/*"
            />
            {file ? (
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={() => inputRef.current?.click()}>
                  Change file
                </SecondaryButton>
                <SecondaryButton
                  onClick={() =>
                    clearSelectedFile(kind === "logo" ? "logo" : "sign")
                  }
                  icon={FiX}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  Remove
                </SecondaryButton>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">
            Saving replaces the previous file for this branch.
          </p>
          <PrimaryButton
            type="submit"
            disabled={uploading || !publicUrl}
            icon={FiSave}
          >
            {uploading ? "Uploading..." : `Save ${kind}`}
          </PrimaryButton>
        </div>
      </form>
    );
  };

  if (loading) {
    return renderShell(
      <div className="animate-pulse space-y-3">
        <div className="h-16 rounded-lg bg-white/80 ring-1 ring-gray-200" />
        <div className="h-9 rounded-lg bg-white/80 ring-1 ring-gray-200" />
        <div className="h-28 rounded-lg bg-white/80 ring-1 ring-gray-200" />
      </div>,
    );
  }

  return renderShell(
    <>
      {/* Identity overview */}
      <div className="mb-3 overflow-hidden rounded-lg border border-indigo-100/80 bg-white shadow-sm">
        <div className="bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_45%,#818cf8_100%)] px-3 py-2.5 md:px-4 text-white">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white/15 ring-1 ring-white/30">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Branch logo"
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <FiBriefcase className="h-3.5 w-3.5 text-white/90" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-100">
                  Branch profile
                </p>
                <h1 className="mt-0.5 truncate text-base md:text-lg font-bold">
                  {branchSettings.name || "Branch settings"}
                </h1>
                <p className="mt-0.5 truncate text-xs text-indigo-100">
                  {branchSettings.legal_name ||
                    "Configure identity, tax, and branding"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                verified={Boolean(panVerified)}
                label={panVerified ? "PAN verified" : "PAN pending"}
              />
              <StatusBadge
                verified={Boolean(gstVerified)}
                label={gstVerified ? "GST verified" : "GST pending"}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-gray-100 border-t border-indigo-50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-2 px-3 py-2">
            <IconBox icon={FiMapPin} tone="gray" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Location
              </p>
              <p className="truncate text-sm font-medium text-gray-800">
                {[branchSettings.city, branchSettings.state]
                  .filter(Boolean)
                  .join(", ") || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <IconBox icon={FiPhone} tone="teal" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Primary mobile
              </p>
              <p className="truncate text-sm font-medium text-gray-800">
                {branchSettings.mobile_1 || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <IconBox icon={FiMail} tone="indigo" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Primary email
              </p>
              <p className="truncate text-sm font-medium text-gray-800">
                {branchSettings.email_1 || "Not set"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {/* Tabs — content-sized segmented control (not full page width) */}
      <div className="mb-3 w-fit max-w-full rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ id, label, icon: Icon, tone }) => {
            const active = activeTab === id;
            const tones = TONE[tone] || TONE.indigo;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition duration-200 ${
                  active
                    ? tones.activeTab
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "details" && (
        <form onSubmit={handleBranchSettingsSubmit} className="space-y-3">
          <SectionCard
            icon={FiBriefcase}
            tone="indigo"
            title="Identity"
            hint="Public name and legal entity used across invoices and documents."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Branch name" required>
                <input
                  type="text"
                  value={branchSettings.name}
                  onChange={(e) =>
                    handleBranchSettingsChange("name", e.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. Mumbai Head Office"
                  required
                />
              </Field>
              <Field label="Legal name">
                <input
                  type="text"
                  value={branchSettings.legal_name}
                  onChange={(e) =>
                    handleBranchSettingsChange("legal_name", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Registered company / firm name"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            icon={FiMapPin}
            tone="gray"
            title="Address"
            hint="Postal address printed on communications and profiles."
          >
            <div className="space-y-3">
              <Field label="Address line 1" required>
                <input
                  type="text"
                  value={branchSettings.address_line_1}
                  onChange={(e) =>
                    handleBranchSettingsChange("address_line_1", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Street, building, area"
                  required
                />
              </Field>
              <Field label="Address line 2">
                <input
                  type="text"
                  value={branchSettings.address_line_2}
                  onChange={(e) =>
                    handleBranchSettingsChange("address_line_2", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Landmark, floor (optional)"
                />
              </Field>
              <StateDistrictSelect
                selectedState={branchSettings.state}
                selectedDistrict={branchSettings.city}
                onStateChange={(value) =>
                  handleBranchSettingsChange("state", value)
                }
                onDistrictChange={(value) =>
                  handleBranchSettingsChange("city", value)
                }
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Pincode" required>
                  <div className="relative">
                    <FiHash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={branchSettings.pincode}
                      onChange={(e) =>
                        handleBranchSettingsChange("pincode", e.target.value)
                      }
                      className={inputWithIconClass}
                      placeholder="6-digit pincode"
                      required
                    />
                  </div>
                </Field>
                <Field label="Country">
                  <input
                    type="text"
                    value={branchSettings.country || "India"}
                    className={inputClass}
                    disabled
                    readOnly
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={FiPhone}
            tone="teal"
            title="Contact"
            hint="How clients and staff reach this branch."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Mobile 1" required>
                <input
                  type="text"
                  value={branchSettings.mobile_1}
                  onChange={(e) =>
                    handleBranchSettingsChange("mobile_1", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Primary mobile"
                  required
                />
              </Field>
              <Field label="Mobile 2">
                <input
                  type="text"
                  value={branchSettings.mobile_2}
                  onChange={(e) =>
                    handleBranchSettingsChange("mobile_2", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Alternate mobile"
                />
              </Field>
              <Field label="Email 1" required>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={branchSettings.email_1}
                    onChange={(e) =>
                      handleBranchSettingsChange("email_1", e.target.value)
                    }
                    className={inputWithIconClass}
                    placeholder="office@example.com"
                    required
                  />
                </div>
              </Field>
              <Field label="Email 2">
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={branchSettings.email_2}
                    onChange={(e) =>
                      handleBranchSettingsChange("email_2", e.target.value)
                    }
                    className={inputWithIconClass}
                    placeholder="support@example.com"
                  />
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            icon={FiShield}
            tone="amber"
            title="Tax information"
            hint="Verified tax identifiers are locked to protect compliance records."
          >
            <Tip>
              Once PAN or GST is verified, it cannot be changed from this screen.
              Contact support if a correction is required.
            </Tip>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="PAN">
                <div className="mb-1.5">
                  <StatusBadge
                    verified={Boolean(panVerified)}
                    label={panVerified ? "Verified" : "Not verified"}
                  />
                </div>
                <input
                  type="text"
                  value={branchSettings.pan}
                  onChange={(e) =>
                    handleBranchSettingsChange(
                      "pan",
                      e.target.value.toUpperCase(),
                    )
                  }
                  className={inputClass}
                  placeholder="ABCDE1234F"
                  maxLength="10"
                  readOnly={Boolean(panVerified)}
                  disabled={Boolean(panVerified)}
                />
              </Field>
              <Field label="GST number">
                <div className="mb-1.5">
                  <StatusBadge
                    verified={Boolean(gstVerified)}
                    label={gstVerified ? "Verified" : "Not verified"}
                  />
                </div>
                <input
                  type="text"
                  value={branchSettings.gst_number}
                  onChange={(e) =>
                    handleBranchSettingsChange(
                      "gst_number",
                      e.target.value.toUpperCase(),
                    )
                  }
                  className={inputClass}
                  placeholder="22AAAAA0000A1Z5"
                  readOnly={Boolean(gstVerified)}
                  disabled={Boolean(gstVerified)}
                />
              </Field>
            </div>
          </SectionCard>

          <div className="overflow-hidden rounded-lg border border-indigo-100 bg-white shadow-sm">
            <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Ready to save branch details?
                </p>
                <p className="text-xs text-gray-500">
                  Changes apply immediately to invoices and branch profiles.
                </p>
              </div>
              <PrimaryButton
                type="submit"
                disabled={detailsSaving}
                icon={FiSave}
                className="w-full sm:w-auto"
              >
                {detailsSaving ? "Saving..." : "Save details"}
              </PrimaryButton>
            </div>
          </div>
        </form>
      )}

      {activeTab === "logo" && (
        <SectionCard
          icon={FiImage}
          tone="violet"
          title="Branch logo"
          hint="Appears on invoices, invitations, and workspace headers."
        >
          <Tip>
            Prefer a square image (1:1). The file is stored once per branch and
            replaced on every update.
          </Tip>
          {renderMediaUploader({
            kind: "logo",
            currentUrl: logoUrl,
            previewUrl: logoPreviewUrl,
            file: logoFile,
            publicUrl: logoPublicUrl,
            uploading: logoUploading,
            dragging: isLogoDragging,
            setDragging: setIsLogoDragging,
            inputRef: logoInputRef,
            onDrop: handleLogoDrop,
            onFileChange: handleLogoFileChange,
            onSubmit: handleLogoUpload,
            title: "Upload a new logo",
            hint: "Best results with a transparent PNG or crisp JPEG.",
            emptyIcon: FiImage,
            tone: "violet",
          })}
        </SectionCard>
      )}

      {activeTab === "signature" && (
        <SectionCard
          icon={FiEdit3}
          tone="sky"
          title="Authorized signature"
          hint="Printed on generated invoices and signed documents."
        >
          <Tip>
            Use a clean signature on a transparent or white background for the
            best invoice appearance.
          </Tip>
          {renderMediaUploader({
            kind: "signature",
            currentUrl: signUrl,
            previewUrl: signPreviewUrl,
            file: signFile,
            publicUrl: signPublicUrl,
            uploading: signUploading,
            dragging: isSignDragging,
            setDragging: setIsSignDragging,
            inputRef: signInputRef,
            onDrop: handleSignDrop,
            onFileChange: handleSignFileChange,
            onSubmit: handleSignUpload,
            title: "Upload a new signature",
            hint: "PNG with transparency works especially well.",
            emptyIcon: FiEdit3,
            tone: "sky",
          })}
        </SectionCard>
      )}

      {activeTab === "invoice" && (
        <form onSubmit={handleInvoiceSettingsSubmit}>
          <SectionCard
            icon={FiFileText}
            tone="emerald"
            title="Invoice address"
            hint="Shown on invoices when it differs from the branch address."
          >
            <Field
              label="Invoice address"
              required
              hint="Include full postal details exactly as they should appear on PDFs."
            >
              <textarea
                value={invoiceSettings.address}
                onChange={(e) =>
                  handleInvoiceSettingsChange("address", e.target.value)
                }
                className={textareaClass}
                rows={4}
                placeholder={"Line 1\nLine 2\nCity, State, Pincode"}
                required
              />
            </Field>
            <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
              <PrimaryButton
                type="submit"
                disabled={invoiceSaving}
                icon={FiSave}
              >
                {invoiceSaving ? "Saving..." : "Save invoice address"}
              </PrimaryButton>
            </div>
          </SectionCard>
        </form>
      )}
    </>,
  );
};

export default BranchSettings;
