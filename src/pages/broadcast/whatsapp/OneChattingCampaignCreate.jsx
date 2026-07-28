import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiFile,
  FiImage,
  FiLoader,
  FiLock,
  FiSend,
  FiUpload,
  FiUsers,
  FiVideo,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import CustomSelect from "../../../components/CustomSelect";
import DateTimePicker, {
  formatDateTimeDisplay,
} from "../../../components/DateTimePicker";
import useDebounce from "../../../components/useDebounce";
import OneChattingTemplatePreview from "../../../components/WhatsApp/OneChattingTemplatePreview";
import { useUserPermissions } from "../../../utils/permission-helper";
import { uploadOneSaasFile } from "../../../utils/onesaas-upload";
import {
  buildTemplateComponents,
  buildTemplatePreviewContent,
  extractApiError,
  getTemplatePlaceholders,
} from "../../../utils/oneChattingSendUtils";
import {
  CLIENT_LIST_QUERY_PARAMS,
  createClientListLoadOptions,
  createFetchLoadOptions,
  getClientOptionLabel,
  getClientOptionValue,
} from "../../../utils/customSelectHelpers";
import {
  normalizeList,
  whatsappApi,
} from "../../../services/whatsappApi";

const contentInset = (isMinimized) =>
  isMinimized ? "md:pl-20" : "md:pl-[260px]";

const FIELD_INPUT =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:opacity-60 bg-white";
const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1";
const FIELD_ERROR = "mt-1 text-xs font-medium text-red-600 m-0";
const FIELD_INPUT_ERROR =
  "border-red-400 focus:ring-red-500 focus:border-red-400";
const SECTION_LABEL =
  "text-[11px] font-bold text-gray-700 uppercase tracking-wide";

const FieldError = ({ message }) =>
  message ? <p className={FIELD_ERROR}>{message}</p> : null;

const AUDIENCE_TABS = [
  { id: "client", label: "Client" },
  { id: "group", label: "Group" },
  { id: "task", label: "Task" },
];

const TASK_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "in process", label: "In Process" },
  { value: "pending from client", label: "Pending from Client" },
  { value: "pending from department", label: "Pending from Department" },
  { value: "complete", label: "Complete" },
  { value: "cancel", label: "Cancel" },
];

const DYNAMIC_VARIABLE_SUGGESTIONS = [
  { token: "{{name}}", label: "name" },
  { token: "{{mobile}}", label: "mobile" },
  { token: "{{email}}", label: "email" },
  { token: "{{balance}}", label: "balance" },
];

const URL_ACCEPT_BY_FORMAT = {
  IMAGE: "image/jpeg,image/png,image/webp,image/gif",
  VIDEO: "video/mp4,video/3gpp,video/quicktime",
  DOCUMENT: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar",
  AUDIO: "audio/aac,audio/mp4,audio/mpeg,audio/ogg,audio/opus",
};

const MEDIA_FORMATS = new Set(["IMAGE", "VIDEO", "DOCUMENT"]);

const AnimatedCheckbox = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}) => (
  <label
    className={`relative inline-flex items-center ${
      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer group"
    }`}
  >
    <input
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
    />
    <motion.span
      className={`flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border-2 transition-colors duration-200 ${
        checked
          ? "bg-emerald-600 border-emerald-600 shadow-sm shadow-emerald-200"
          : "bg-white border-gray-300 group-hover:border-emerald-400"
      }`}
      animate={{ scale: checked ? [1, 1.12, 1] : 1 }}
      transition={{ duration: 0.18 }}
    >
      <AnimatePresence initial={false} mode="wait">
        {checked ? (
          <motion.svg
            key="check"
            viewBox="0 0 12 12"
            className="w-3 h-3 text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            <path
              d="M2.5 6l2.2 2.2 4.8-4.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        ) : null}
      </AnimatePresence>
    </motion.span>
  </label>
);

const formatScheduleDate = (localDatetime) => {
  if (!localDatetime) return "";
  const [date, time] = String(localDatetime).split("T");
  if (!date || !time) return "";
  const hhmmss = time.length === 5 ? `${time}:00` : time.slice(0, 8);
  return `${date} ${hhmmss}`;
};

const formatClientDisplayNumber = (item) => {
  const cc = String(item?.country_code || "")
    .replace(/\D/g, "")
    .trim();
  const mobile = String(item?.mobile || "")
    .replace(/\D/g, "")
    .trim();
  if (cc && mobile) return `${cc} ${mobile}`;
  return mobile || "";
};

const renderCampaignClientOption = (item) => {
  const name = item?.name || "—";
  const phone = formatClientDisplayNumber(item);
  const email = item?.email || "";
  return (
    <div className="flex items-center gap-2 text-sm min-w-0">
      <span className="font-medium text-gray-900 truncate">{name}</span>
      {phone ? (
        <>
          <span className="text-gray-400 shrink-0">•</span>
          <span className="text-gray-600 truncate font-mono text-xs">
            {phone}
          </span>
        </>
      ) : null}
      {email ? (
        <>
          <span className="text-gray-400 shrink-0">•</span>
          <span className="text-gray-500 text-xs truncate">{email}</span>
        </>
      ) : null}
    </div>
  );
};

const loadClientOptions = createClientListLoadOptions({
  ...CLIENT_LIST_QUERY_PARAMS,
  limit: 20,
});

const getGroupFirmCount = (g) => {
  const n = Number(g?.firm_count ?? g?.group?.firm_count ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatGroupOptionLabel = (g) => {
  const name = g?.name || g?.group_name || `Group ${g?.group_id}`;
  const count = getGroupFirmCount(g);
  return `${name} (${count} firm${count === 1 ? "" : "s"})`;
};

let cachedGroupOptions = null;
let groupOptionsPromise = null;

const mapGroupOption = (g) => {
  const firmCount = getGroupFirmCount(g);
  return {
    value: g.group_id,
    label: formatGroupOptionLabel(g),
    firm_count: firmCount,
    isDisabled: firmCount === 0,
    group: g,
  };
};

const fetchGroupOptions = async ({ force = false } = {}) => {
  if (!force && Array.isArray(cachedGroupOptions)) {
    return cachedGroupOptions;
  }
  if (!force && groupOptionsPromise) {
    return groupOptionsPromise;
  }

  groupOptionsPromise = createFetchLoadOptions({
    endpoint: "/group/list",
    queryParams: { page: 1, limit: 100 },
    dataExtractor: (response) => (response?.data || []).map(mapGroupOption),
  })("").then((options) => {
    cachedGroupOptions = Array.isArray(options) ? options : [];
    return cachedGroupOptions;
  });

  try {
    return await groupOptionsPromise;
  } finally {
    groupOptionsPromise = null;
  }
};

const renderGroupOption = (option) => {
  const count = getGroupFirmCount(option);
  const name =
    option?.group?.name ||
    option?.group?.group_name ||
    option?.label?.replace(/\s*\(\d+\s+firms?\)$/, "") ||
    `Group ${option?.value}`;
  return (
    <div className="flex items-center justify-between gap-2 text-sm min-w-0 w-full">
      <span className="font-medium text-gray-900 truncate">{name}</span>
      <span
        className={`shrink-0 text-xs tabular-nums ${
          count === 0 ? "text-gray-400" : "text-gray-500"
        }`}
      >
        {count} firm{count === 1 ? "" : "s"}
      </span>
    </div>
  );
};

const loadServiceOptions = createFetchLoadOptions({
  endpoint: "/service/list",
  queryParams: { page_no: 1, limit: 100 },
  dataExtractor: (response) =>
    (response?.data || []).map((s) => ({
      value: s.service_id,
      label: s.name || `Service ${s.service_id}`,
      service: s,
    })),
});

const MediaFormatIcon = ({ format }) => {
  if (format === "IMAGE") return <FiImage className="w-5 h-5" />;
  if (format === "VIDEO") return <FiVideo className="w-5 h-5" />;
  return <FiFile className="w-5 h-5" />;
};

const HeaderMediaUploadField = ({
  field,
  value,
  onChange,
  disabled,
  error,
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const format = String(field.format || "DOCUMENT").toUpperCase();
  const showError = error || uploadError;

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setFileName(file.name);
    setUploadError("");
    try {
      const { url } = await uploadOneSaasFile(file, setProgress);
      onChange(url);
      toast.success(`${format.toLowerCase()} uploaded`);
    } catch (err) {
      setUploadError(extractApiError(err, "Failed to upload file"));
      setFileName("");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clear = () => {
    onChange("");
    setFileName("");
    setUploadError("");
  };

  return (
    <div
      className={`rounded-xl border border-dashed p-3 space-y-2.5 ${
        showError
          ? "border-red-300 bg-red-50/40"
          : "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <MediaFormatIcon format={format} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 m-0">
            {field.label || `Header ${format.toLowerCase()}`}
            {field.required ? <span className="text-red-500"> *</span> : null}
          </p>
          <p className="text-xs text-gray-500 m-0 mt-0.5">
            Upload a {format.toLowerCase()} via OneSaaS storage, or paste a
            public URL.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={value || ""}
          onChange={(e) => {
            setUploadError("");
            onChange(e.target.value);
          }}
          placeholder={field.example || `${format.toLowerCase()} URL`}
          disabled={disabled || uploading}
          className={`${FIELD_INPUT} flex-1 min-w-0 font-mono text-xs ${
            showError ? FIELD_INPUT_ERROR : ""
          }`}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={URL_ACCEPT_BY_FORMAT[format] || "*/*"}
          onChange={handleUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 disabled:opacity-50 shrink-0"
        >
          {uploading ? (
            <FiLoader className="w-4 h-4 animate-spin" />
          ) : (
            <FiUpload className="w-4 h-4" />
          )}
          {uploading ? `${progress}%` : "Upload"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={clear}
            disabled={disabled || uploading}
            className="inline-flex items-center justify-center px-2.5 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-100 border border-gray-200 disabled:opacity-50"
            title="Clear"
          >
            <FiX className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {uploading ? (
        <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <FieldError message={showError} />

      {fileName && value ? (
        <p className="text-xs text-emerald-700 m-0 truncate">
          Uploaded: {fileName}
        </p>
      ) : value ? (
        <p className="text-xs text-gray-500 m-0 truncate font-mono">{value}</p>
      ) : null}

      {format === "IMAGE" && value ? (
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-h-36">
          <img
            src={value}
            alt="Header preview"
            className="w-full max-h-36 object-contain"
          />
        </div>
      ) : null}
    </div>
  );
};

const CampaignConfirmModal = ({
  open,
  onClose,
  onConfirm,
  loading,
  summary,
}) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="campaign-confirm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={loading ? undefined : onClose}
            disabled={loading}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                    <FiSend className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-emerald-100 m-0 uppercase tracking-wide">
                      Confirm campaign
                    </p>
                    <h2 className="text-lg font-bold m-0 truncate leading-tight">
                      Ready to create?
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600 m-0">
                Double-check the details below before creating this WhatsApp
                campaign.
              </p>

              <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {[
                  { label: "Name", value: summary.name },
                  { label: "Template", value: summary.template },
                  { label: "Audience", value: summary.audience },
                  { label: "Schedule", value: summary.schedule },
                  summary.media
                    ? { label: "Header media", value: summary.media }
                    : null,
                ]
                  .filter(Boolean)
                  .map((row) => (
                    <div
                      key={row.label}
                      className="px-3.5 py-2.5 flex items-start justify-between gap-3 bg-white"
                    >
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 pt-0.5">
                        {row.label}
                      </span>
                      <span className="text-sm font-medium text-gray-800 text-right break-words">
                        {row.value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200 disabled:opacity-50"
              >
                {loading ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <FiCheckCircle className="w-4 h-4" />
                )}
                {loading ? "Creating…" : "Create campaign"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

const OneChattingCampaignCreate = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [name, setName] = useState("");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = useCallback((key) => {
    setFieldErrors((prev) => {
      if (!prev?.[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableValues, setVariableValues] = useState({});

  const [audienceType, setAudienceType] = useState("client");
  const [selectAllClients, setSelectAllClients] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [groupOptions, setGroupOptions] = useState(
    () => cachedGroupOptions || [],
  );
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(TASK_STATUS_OPTIONS[0]);

  const [resolvedRecipients, setResolvedRecipients] = useState([]);
  const [resolveMeta, setResolveMeta] = useState(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await whatsappApi.getTemplateList({
        status: "APPROVED",
        page_no: 1,
        limit: 100,
      });
      setTemplates(normalizeList(res?.data));
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load templates"));
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const loadGroups = useCallback(async ({ force = false, silent = false } = {}) => {
    if (silent && Array.isArray(cachedGroupOptions)) {
      setGroupOptions(cachedGroupOptions);
      return cachedGroupOptions;
    }
    if (!silent) setGroupsLoading(true);
    try {
      const options = await fetchGroupOptions({ force });
      setGroupOptions(options);
      return options;
    } catch (error) {
      if (!silent) {
        toast.error(extractApiError(error, "Failed to load groups"));
      }
      setGroupOptions([]);
      return [];
    } finally {
      if (!silent) setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (audienceType !== "group") return;
    if (groupOptions.length || groupsLoading) return;
    loadGroups();
  }, [audienceType, groupOptions.length, groupsLoading, loadGroups]);

  const templateOptions = useMemo(
    () =>
      templates.map((t) => ({
        value: t.template_id,
        label: t.template_name,
        template: t,
      })),
    [templates],
  );

  const selectedTemplateOption = useMemo(
    () =>
      templateOptions.find((o) => o.value === selectedTemplate?.template_id) ||
      null,
    [templateOptions, selectedTemplate],
  );

  const placeholders = useMemo(() => {
    if (!selectedTemplate?.template) return [];
    return getTemplatePlaceholders(selectedTemplate.template);
  }, [selectedTemplate]);

  const mediaPlaceholders = useMemo(
    () =>
      placeholders.filter(
        (f) =>
          f.componentType === "header" &&
          MEDIA_FORMATS.has(String(f.format || "").toUpperCase()),
      ),
    [placeholders],
  );

  const textPlaceholders = useMemo(
    () =>
      placeholders.filter(
        (f) =>
          !(
            f.componentType === "header" &&
            MEDIA_FORMATS.has(String(f.format || "").toUpperCase())
          ),
      ),
    [placeholders],
  );

  const previewContent = useMemo(() => {
    if (!selectedTemplate?.template) return null;
    return buildTemplatePreviewContent(
      selectedTemplate.template,
      variableValues,
    );
  }, [selectedTemplate, variableValues]);

  const audiencePayload = useMemo(() => {
    if (audienceType === "client") {
      return {
        audience_type: "client",
        select_all_clients: selectAllClients,
        usernames: selectAllClients
          ? []
          : selectedClients.map((c) => getClientOptionValue(c)).filter(Boolean),
      };
    }
    if (audienceType === "group") {
      return {
        audience_type: "group",
        group_ids: selectedGroups
          .map((g) => g?.value ?? g?.group_id ?? g?.group?.group_id)
          .filter((id) => id !== undefined && id !== null && String(id).trim()),
      };
    }
    return {
      audience_type: "task",
      service_id: selectedService?.value
        ? String(selectedService.value)
        : "",
      status: selectedStatus?.value || "all",
    };
  }, [
    audienceType,
    selectAllClients,
    selectedClients,
    selectedGroups,
    selectedService,
    selectedStatus,
  ]);

  const showResolvedPreview =
    audienceType === "client" && !selectAllClients;

  const debouncedAudienceKey = useDebounce(
    JSON.stringify(audiencePayload),
    400,
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!showResolvedPreview || selectedClients.length === 0) {
        setResolvedRecipients([]);
        setResolveMeta(null);
        setResolveError("");
        setResolveLoading(false);
        return;
      }

      setResolveLoading(true);
      setResolveError("");
      try {
        const res = await whatsappApi.resolveCampaignRecipients(
          JSON.parse(debouncedAudienceKey),
        );
        if (cancelled) return;
        setResolvedRecipients(normalizeList(res?.data));
        setResolveMeta(res?.meta || null);
      } catch (error) {
        if (cancelled) return;
        setResolvedRecipients([]);
        setResolveMeta(null);
        setResolveError(
          extractApiError(error, "Failed to resolve recipients"),
        );
      } finally {
        if (!cancelled) setResolveLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedAudienceKey, showResolvedPreview, selectedClients.length]);

  const selectTemplate = (option) => {
    const template = option?.template || null;
    setSelectedTemplate(template);
    clearFieldError("template");
    const next = {};
    if (template?.template) {
      getTemplatePlaceholders(template.template).forEach((field) => {
        if (field.example) next[field.key] = field.example;
      });
    }
    setVariableValues(next);
    setFieldErrors((prev) => {
      const cleaned = { ...prev };
      delete cleaned.template;
      Object.keys(cleaned).forEach((key) => {
        if (key.startsWith("var_")) delete cleaned[key];
      });
      return cleaned;
    });
  };

  const handleAudienceTypeChange = (next) => {
    setAudienceType(next || "client");
    setSelectAllClients(false);
    setSelectedClients([]);
    setSelectedGroups([]);
    setSelectedService(null);
    setSelectedStatus(TASK_STATUS_OPTIONS[0]);
    setResolvedRecipients([]);
    setResolveMeta(null);
    setResolveError("");
    setFieldErrors((prev) => {
      const cleaned = { ...prev };
      delete cleaned.clients;
      delete cleaned.groups;
      delete cleaned.service;
      delete cleaned.audience;
      return cleaned;
    });
  };

  const audienceSummaryLabel = useMemo(() => {
    if (audienceType === "client") {
      if (selectAllClients) return "All clients";
      const n = selectedClients.length;
      return `${n} client${n === 1 ? "" : "s"} selected`;
    }
    if (audienceType === "group") {
      const n = selectedGroups.length;
      return `${n} group${n === 1 ? "" : "s"}`;
    }
    const service = selectedService?.label || "Service";
    const status = selectedStatus?.label || "All";
    return `Task · ${service} · ${status}`;
  }, [
    audienceType,
    selectAllClients,
    selectedClients.length,
    selectedGroups.length,
    selectedService,
    selectedStatus,
  ]);

  const confirmSummary = useMemo(() => {
    const mediaField = mediaPlaceholders[0];
    const mediaUrl = mediaField
      ? String(variableValues[mediaField.key] || "").trim()
      : "";
    return {
      name: name.trim() || "—",
      template: selectedTemplate?.template_name || "—",
      audience: audienceSummaryLabel,
      schedule: scheduleLocal
        ? formatDateTimeDisplay(scheduleLocal)
        : "Send as soon as ready",
      media: mediaUrl
        ? `${String(mediaField.format || "").toLowerCase()} attached`
        : null,
    };
  }, [
    name,
    selectedTemplate,
    audienceSummaryLabel,
    scheduleLocal,
    mediaPlaceholders,
    variableValues,
  ]);

  const validateBeforeConfirm = () => {
    const nextErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Campaign name is required";
    }
    if (!selectedTemplate?.template_id) {
      nextErrors.template = "Please select an approved template";
    }

    if (audienceType === "client") {
      if (!selectAllClients && selectedClients.length === 0) {
        nextErrors.clients = "Select at least one client, or enable Select all";
      } else if (showResolvedPreview) {
        if (resolveLoading) {
          nextErrors.clients =
            "Still resolving recipients — try again in a moment";
        } else if (!resolvedRecipients.length) {
          nextErrors.clients =
            resolveError ||
            "No valid WhatsApp numbers found for this selection";
        }
      }
    } else if (audienceType === "group") {
      if (selectedGroups.length === 0) {
        nextErrors.groups = "Select at least one group";
      }
    } else if (!selectedService?.value) {
      nextErrors.service = "Please select a service";
    }

    placeholders.forEach((field) => {
      if (field.required && !String(variableValues[field.key] || "").trim()) {
        nextErrors[`var_${field.key}`] = `${field.label} is required`;
      }
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRequestCreate = (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validateBeforeConfirm()) return;
    setConfirmOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (saving) return;

    const component = buildTemplateComponents(
      selectedTemplate.template,
      variableValues,
    );
    const schedule_date = formatScheduleDate(scheduleLocal);

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        template_id: String(selectedTemplate.template_id),
        component,
        audience: audiencePayload,
      };
      if (schedule_date) payload.schedule_date = schedule_date;

      const res = await whatsappApi.createCampaign(payload);
      const campaignId = res?.campaign_id;
      toast.success(res?.msg || res?.message || "Campaign created");
      setConfirmOpen(false);
      if (campaignId) {
        navigate(`/broadcast/whatsapp/onechatting/campaigns/${campaignId}`);
      } else {
        navigate("/broadcast/whatsapp/onechatting/campaigns");
      }
    } catch (error) {
      toast.error(extractApiError(error, "Failed to create campaign"));
    } finally {
      setSaving(false);
    }
  };

  if (!check("broadcast_send")) {
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
        <div
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${contentInset(isMinimized)}`}
        >
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiLock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Access Denied
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              You do not have permission to create campaigns.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-gray-50 to-gray-100">
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

      <div
        className={`pt-16 transition-all duration-300 ${contentInset(isMinimized)}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-6 my-3 md:my-4">
          <form
            onSubmit={handleRequestCreate}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 px-3 md:px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-white via-emerald-50/40 to-white">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/broadcast/whatsapp/onechatting/campaigns")
                  }
                  className="p-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white hover:border-emerald-200 shrink-0 transition-colors"
                  title="Back"
                >
                  <FiArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                  <FiSend className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight truncate m-0">
                    Create campaign
                  </h1>
                  <p className="text-xs text-gray-500 m-0 truncate">
                    Bulk send an approved WhatsApp template
                  </p>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving || resolveLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200 disabled:opacity-50 ml-auto shrink-0"
              >
                {saving ? (
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FiSend className="w-3.5 h-3.5" />
                )}
                Review & create
              </button>
            </div>

            <div className="p-4 md:p-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5">
              <div className="space-y-4 min-w-0">
                {/* Basics */}
                <section className="rounded-xl border border-gray-200 bg-white p-3.5 md:p-4">
                  <p className={`${SECTION_LABEL} mb-3 m-0`}>Basics</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-1">
                      <label className={FIELD_LABEL}>
                        Campaign name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          clearFieldError("name");
                        }}
                        placeholder="March promo"
                        disabled={saving}
                        className={`${FIELD_INPUT} ${
                          fieldErrors.name ? FIELD_INPUT_ERROR : ""
                        }`}
                        aria-invalid={Boolean(fieldErrors.name)}
                      />
                      <FieldError message={fieldErrors.name} />
                    </div>
                    <div>
                      <DateTimePicker
                        label="Schedule (optional, IST)"
                        value={scheduleLocal}
                        onChange={setScheduleLocal}
                        disabled={saving}
                        placeholder="Send as soon as ready"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={FIELD_LABEL}>
                        Template <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        options={templateOptions}
                        value={selectedTemplateOption}
                        onChange={selectTemplate}
                        placeholder={
                          templatesLoading
                            ? "Loading templates…"
                            : "Select approved template"
                        }
                        searchPlaceholder="Search templates…"
                        noOptionsMessage="No approved templates"
                        isClearable={false}
                        isDisabled={saving || templatesLoading}
                      />
                      <FieldError message={fieldErrors.template} />
                    </div>
                  </div>
                </section>

                {/* Media header upload */}
                {mediaPlaceholders.length > 0 ? (
                  <section className="rounded-xl border border-gray-200 bg-white p-3.5 md:p-4 space-y-3">
                    <p className={`${SECTION_LABEL} m-0`}>Header media</p>
                    <div className="grid grid-cols-1 gap-3">
                      {mediaPlaceholders.map((field) => (
                        <HeaderMediaUploadField
                          key={field.key}
                          field={field}
                          value={variableValues[field.key] || ""}
                          onChange={(next) => {
                            setVariableValues((prev) => ({
                              ...prev,
                              [field.key]: next,
                            }));
                            clearFieldError(`var_${field.key}`);
                          }}
                          disabled={saving}
                          error={fieldErrors[`var_${field.key}`]}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Template variables */}
                {textPlaceholders.length > 0 ? (
                  <section className="rounded-xl border border-gray-200 bg-white p-3.5 md:p-4">
                    <p className={`${SECTION_LABEL} mb-3 m-0`}>
                      Template variables
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {textPlaceholders.map((field) => (
                        <div
                          key={field.key}
                          className={
                            field.componentType === "body"
                              ? "sm:col-span-2"
                              : ""
                          }
                        >
                          <label className={FIELD_LABEL}>
                            {field.label}
                            {field.required ? (
                              <span className="text-red-500"> *</span>
                            ) : null}
                          </label>
                          <input
                            type="text"
                            value={variableValues[field.key] || ""}
                            onChange={(e) => {
                              setVariableValues((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }));
                              clearFieldError(`var_${field.key}`);
                            }}
                            placeholder={
                              field.componentType === "body"
                                ? field.example || "{{name}}"
                                : field.example || field.label
                            }
                            disabled={saving}
                            className={`${FIELD_INPUT} ${
                              fieldErrors[`var_${field.key}`]
                                ? FIELD_INPUT_ERROR
                                : ""
                            }`}
                            aria-invalid={Boolean(
                              fieldErrors[`var_${field.key}`],
                            )}
                          />
                          <FieldError
                            message={fieldErrors[`var_${field.key}`]}
                          />
                          {field.componentType === "body" ? (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] text-gray-400 mr-0.5">
                                Suggestions:
                              </span>
                              {DYNAMIC_VARIABLE_SUGGESTIONS.map(
                                (suggestion) => {
                                  const active =
                                    String(
                                      variableValues[field.key] || "",
                                    ).trim() === suggestion.token;
                                  return (
                                    <button
                                      key={suggestion.token}
                                      type="button"
                                      disabled={saving}
                                      onClick={() => {
                                        setVariableValues((prev) => ({
                                          ...prev,
                                          [field.key]: suggestion.token,
                                        }));
                                        clearFieldError(`var_${field.key}`);
                                      }}
                                      className={`px-2 py-0.5 rounded-md text-xs font-mono transition-colors ${
                                        active
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                          : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
                                      } disabled:opacity-50`}
                                    >
                                      {suggestion.token}
                                    </button>
                                  );
                                },
                              )}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Audience */}
                <section className="rounded-xl border border-gray-200 bg-white p-3.5 md:p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FiUsers className="w-3.5 h-3.5 text-emerald-600" />
                      <p className={`${SECTION_LABEL} m-0`}>Audience</p>
                    </div>
                    <nav className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100">
                      {AUDIENCE_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          disabled={saving}
                          onClick={() => handleAudienceTypeChange(tab.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 ${
                            audienceType === tab.id
                              ? "bg-white text-emerald-700 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {audienceType === "client" ? (
                    <div className="grid grid-cols-1 gap-3">
                      <label className="inline-flex items-center gap-2.5 text-sm font-medium text-gray-700 select-none">
                        <AnimatedCheckbox
                          checked={selectAllClients}
                          disabled={saving}
                          ariaLabel="Select all clients"
                          onChange={(e) => {
                            setSelectAllClients(e.target.checked);
                            if (e.target.checked) setSelectedClients([]);
                            clearFieldError("clients");
                          }}
                        />
                        Select all clients
                      </label>
                      {!selectAllClients ? (
                        <div>
                          <label className={FIELD_LABEL}>
                            Clients <span className="text-red-500">*</span>
                          </label>
                          <CustomSelect
                            isMulti
                            loadOptions={loadClientOptions}
                            defaultOptions
                            debounceMs={350}
                            value={selectedClients}
                            onChange={(next) => {
                              setSelectedClients(
                                Array.isArray(next) ? next : [],
                              );
                              clearFieldError("clients");
                            }}
                            getOptionLabel={getClientOptionLabel}
                            getOptionValue={getClientOptionValue}
                            renderOption={renderCampaignClientOption}
                            placeholder="Search and select clients…"
                            searchPlaceholder="Search clients…"
                            noOptionsMessage="No clients found"
                            isDisabled={saving}
                          />
                          <FieldError message={fieldErrors.clients} />
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-gray-500 m-0">
                            All branch clients with valid mobile numbers will be
                            included.
                          </p>
                          <FieldError message={fieldErrors.clients} />
                        </>
                      )}
                    </div>
                  ) : null}

                  {audienceType === "group" ? (
                    <div>
                      <label className={FIELD_LABEL}>
                        Groups <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        isMulti
                        options={groupOptions}
                        value={selectedGroups}
                        onChange={(next) => {
                          setSelectedGroups(
                            (Array.isArray(next) ? next : []).filter(
                              (g) => getGroupFirmCount(g) > 0,
                            ),
                          );
                          clearFieldError("groups");
                        }}
                        renderOption={renderGroupOption}
                        isOptionDisabled={(option) =>
                          getGroupFirmCount(option) === 0 ||
                          Boolean(option?.isDisabled)
                        }
                        placeholder="Search and select groups…"
                        searchPlaceholder="Search groups…"
                        noOptionsMessage="No groups found"
                        isDisabled={saving || groupsLoading}
                      />
                      {groupsLoading ? (
                        <p className="text-xs text-gray-400 mt-1 m-0">
                          Loading groups...
                        </p>
                      ) : null}
                      <FieldError message={fieldErrors.groups} />
                    </div>
                  ) : null}

                  {audienceType === "task" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={FIELD_LABEL}>
                          Service <span className="text-red-500">*</span>
                        </label>
                        <CustomSelect
                          loadOptions={loadServiceOptions}
                          value={selectedService}
                          onChange={(option) => {
                            setSelectedService(option);
                            clearFieldError("service");
                          }}
                          placeholder="Select service…"
                          searchPlaceholder="Search services…"
                          noOptionsMessage="No services found"
                          isClearable={false}
                          isDisabled={saving}
                        />
                        <FieldError message={fieldErrors.service} />
                      </div>
                      <div>
                        <label className={FIELD_LABEL}>Status</label>
                        <CustomSelect
                          options={TASK_STATUS_OPTIONS}
                          value={selectedStatus}
                          onChange={(option) =>
                            setSelectedStatus(option || TASK_STATUS_OPTIONS[0])
                          }
                          isClearable={false}
                          isSearchable={false}
                          isDisabled={saving}
                        />
                      </div>
                    </div>
                  ) : null}

                  {showResolvedPreview ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 m-0">
                          Resolved recipients
                        </p>
                        {resolveLoading ? (
                          <FiLoader className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          <span className="text-sm font-medium text-emerald-800">
                            {resolvedRecipients.length} number
                            {resolvedRecipients.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                      {resolveError ? (
                        <p className="text-xs text-red-600 mt-2 m-0">
                          {resolveError}
                        </p>
                      ) : null}
                      {resolveMeta?.duplicates_skipped ? (
                        <p className="text-xs text-gray-500 mt-1 m-0">
                          {resolveMeta.duplicates_skipped} duplicate number
                          {resolveMeta.duplicates_skipped === 1 ? "" : "s"}{" "}
                          skipped
                        </p>
                      ) : null}
                      {resolvedRecipients.length > 0 ? (
                        <ul className="mt-2 max-h-32 overflow-y-auto space-y-1 m-0 p-0 list-none">
                          {resolvedRecipients.slice(0, 40).map((row) => (
                            <li
                              key={`${row.number}-${row.profile_id}`}
                              className="text-xs text-gray-700 font-mono truncate"
                            >
                              {row.display_number || row.number}
                              {row.name ? (
                                <span className="text-gray-400 font-sans">
                                  {" "}
                                  · {row.name}
                                </span>
                              ) : null}
                            </li>
                          ))}
                          {resolvedRecipients.length > 40 ? (
                            <li className="text-xs text-gray-400 font-sans">
                              +{resolvedRecipients.length - 40} more
                            </li>
                          ) : null}
                        </ul>
                      ) : !resolveLoading && selectedClients.length > 0 ? (
                        <p className="text-xs text-gray-500 mt-2 m-0">
                          No valid numbers for this selection.
                        </p>
                      ) : selectedClients.length === 0 ? (
                        <p className="text-xs text-gray-500 mt-2 m-0">
                          Select clients to preview numbers.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              </div>

              {/* Preview column */}
              <aside className="min-w-0">
                <div className="xl:sticky xl:top-20 space-y-3">
                  <p className={`${SECTION_LABEL} m-0`}>Live preview</p>
                  <div className="rounded-2xl bg-[#e5ddd5] p-3 flex justify-center shadow-inner border border-black/5">
                    {previewContent ? (
                      <OneChattingTemplatePreview
                        content={previewContent}
                        className="w-[280px] max-w-[280px]"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-500 m-0 px-2 py-10 text-center">
                        Select a template to preview
                      </p>
                    )}
                  </div>
                  {selectedTemplate ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-sm font-semibold text-gray-800 m-0 truncate">
                        {selectedTemplate.template_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 m-0">
                        {selectedTemplate.category || "—"} ·{" "}
                        {(
                          selectedTemplate.template?.language || "en"
                        ).toUpperCase()}
                      </p>
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>
          </form>
        </div>
      </div>

      <CampaignConfirmModal
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        onConfirm={handleConfirmCreate}
        loading={saving}
        summary={confirmSummary}
      />
    </div>
  );
};

export default OneChattingCampaignCreate;
