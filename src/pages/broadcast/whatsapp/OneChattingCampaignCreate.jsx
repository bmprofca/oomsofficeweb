import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiLoader,
  FiLock,
  FiSend,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import CustomSelect from "../../../components/CustomSelect";
import useDebounce from "../../../components/useDebounce";
import OneChattingTemplatePreview from "../../../components/WhatsApp/OneChattingTemplatePreview";
import { useUserPermissions } from "../../../utils/permission-helper";
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

const TOOLBAR_ROW =
  "flex items-center gap-3 px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white";
const TOOLBAR_BTN = "px-3 py-2 text-sm font-medium rounded-lg";
const FIELD_INPUT =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60";
const CELL_TITLE = "font-semibold text-gray-800 text-sm";
const CELL_BODY = "text-sm font-medium text-gray-700";
const CELL_SUB = "text-xs text-gray-400";
const SECTION_LABEL =
  "text-[11px] font-bold text-gray-700 uppercase tracking-wide";

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

/** Tokens replaced per recipient by OneChatting / backend. */
const DYNAMIC_VARIABLE_SUGGESTIONS = [
  { token: "{{name}}", label: "name" },
  { token: "{{mobile}}", label: "mobile" },
  { token: "{{email}}", label: "email" },
  { token: "{{balance}}", label: "balance" },
];

/** Same animated checkbox pattern as TaskTable / group-firms. */
const AnimatedCheckbox = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}) => {
  return (
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
            ? "bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-200"
            : "bg-white border-gray-300 group-hover:border-indigo-400"
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
};
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

const loadGroupOptions = createFetchLoadOptions({
  endpoint: "/group/list",
  queryParams: { page: 1, limit: 100 },
  dataExtractor: (response) =>
    (response?.data || []).map((g) => {
      const firmCount = getGroupFirmCount(g);
      return {
        value: g.group_id,
        label: formatGroupOptionLabel(g),
        firm_count: firmCount,
        isDisabled: firmCount === 0,
        group: g,
      };
    }),
});

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

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableValues, setVariableValues] = useState({});

  const [audienceType, setAudienceType] = useState("client");
  const [selectAllClients, setSelectAllClients] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
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
      templateOptions.find(
        (o) => o.value === selectedTemplate?.template_id,
      ) || null,
    [templateOptions, selectedTemplate],
  );

  const placeholders = useMemo(() => {
    if (!selectedTemplate?.template) return [];
    return getTemplatePlaceholders(selectedTemplate.template);
  }, [selectedTemplate]);

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
          : selectedClients
              .map((c) => getClientOptionValue(c))
              .filter(Boolean),
      };
    }
    if (audienceType === "group") {
      return {
        audience_type: "group",
        group_ids: selectedGroups
          .map((g) => Number(g.value ?? g.group_id))
          .filter((id) => Number.isFinite(id) && id > 0),
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

  const audienceReady = useMemo(() => {
    if (audienceType === "client") {
      return selectAllClients || selectedClients.length > 0;
    }
    if (audienceType === "group") {
      return selectedGroups.length > 0;
    }
    return Boolean(selectedService?.value);
  }, [
    audienceType,
    selectAllClients,
    selectedClients,
    selectedGroups,
    selectedService,
  ]);

  /** Preview resolve only when manually picking clients (not select-all / group / task). */
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
    const next = {};
    if (template?.template) {
      getTemplatePlaceholders(template.template).forEach((field) => {
        if (field.example) next[field.key] = field.example;
      });
    }
    setVariableValues(next);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Campaign name is required");
      return;
    }
    if (!selectedTemplate?.template_id) {
      toast.error("Please select an approved template");
      return;
    }
    if (!audienceReady) {
      toast.error("Please complete audience selection");
      return;
    }
    if (showResolvedPreview) {
      if (resolveLoading) {
        toast.error("Still resolving recipients — try again in a moment");
        return;
      }
      if (!resolvedRecipients.length) {
        toast.error(
          resolveError || "No valid WhatsApp numbers found for this selection",
        );
        return;
      }
    }

    const missing = placeholders.find(
      (field) => field.required && !variableValues[field.key]?.trim(),
    );
    if (missing) {
      toast.error(`Please fill in ${missing.label}`);
      return;
    }

    const component = buildTemplateComponents(
      selectedTemplate.template,
      variableValues,
    );
    const schedule_date = formatScheduleDate(scheduleLocal);

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        template_id: String(selectedTemplate.template_id),
        component,
        audience: audiencePayload,
      };
      if (schedule_date) payload.schedule_date = schedule_date;

      const res = await whatsappApi.createCampaign(payload);
      const campaignId = res?.campaign_id;
      toast.success(res?.msg || res?.message || "Campaign created");
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
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
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className={`${TOOLBAR_ROW} flex-wrap gap-y-2`}>
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/broadcast/whatsapp/onechatting/campaigns")
                  }
                  className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 shrink-0"
                  title="Back"
                >
                  <FiArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <FiSend className="w-4 h-4 text-green-600" />
                </div>
                <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight truncate">
                  Create Campaign
                </h1>
              </div>
              <button
                type="submit"
                disabled={saving || resolveLoading}
                className={`${TOOLBAR_BTN} inline-flex items-center gap-1.5 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 ml-auto shrink-0`}
              >
                {saving ? (
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FiSend className="w-3.5 h-3.5" />
                )}
                {saving ? "Creating…" : "Create campaign"}
              </button>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
              <div className="space-y-5 min-w-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="March promo"
                    disabled={saving}
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                </div>

                {placeholders.length > 0 ? (
                  <div className="space-y-3">
                    <p className={`${SECTION_LABEL} m-0`}>Template variables</p>
                    {placeholders.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required ? (
                            <span className="text-red-500"> *</span>
                          ) : null}
                        </label>
                        <input
                          type="text"
                          value={variableValues[field.key] || ""}
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={
                            field.componentType === "body"
                              ? field.example || "{{name}}"
                              : field.example || field.label
                          }
                          disabled={saving}
                          className={FIELD_INPUT}
                        />
                        {field.componentType === "body" ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={`${CELL_SUB} mr-0.5`}>
                              Suggestions:
                            </span>
                            {DYNAMIC_VARIABLE_SUGGESTIONS.map((suggestion) => {
                              const active =
                                String(
                                  variableValues[field.key] || "",
                                ).trim() === suggestion.token;
                              return (
                                <button
                                  key={suggestion.token}
                                  type="button"
                                  disabled={saving}
                                  onClick={() =>
                                    setVariableValues((prev) => ({
                                      ...prev,
                                      [field.key]: suggestion.token,
                                    }))
                                  }
                                  className={`px-2 py-0.5 rounded-md text-xs font-mono transition-colors ${
                                    active
                                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                      : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200 hover:text-gray-800"
                                  } disabled:opacity-50`}
                                  title={`Insert ${suggestion.token} (replaced per client)`}
                                >
                                  {suggestion.token}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`${SECTION_LABEL} m-0`}>Audience</p>
                    <nav className="flex items-center gap-1 shrink-0">
                      {AUDIENCE_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          disabled={saving}
                          onClick={() => handleAudienceTypeChange(tab.id)}
                          className={`${TOOLBAR_BTN} transition-colors disabled:opacity-50 ${
                            audienceType === tab.id
                              ? "bg-green-50 text-green-700"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {audienceType === "client" ? (
                    <div className="space-y-3">
                      <label className="inline-flex items-center gap-2.5 text-sm font-medium text-gray-700 select-none">
                        <AnimatedCheckbox
                          checked={selectAllClients}
                          disabled={saving}
                          ariaLabel="Select all clients"
                          onChange={(e) => {
                            setSelectAllClients(e.target.checked);
                            if (e.target.checked) setSelectedClients([]);
                          }}
                        />
                        Select all clients
                      </label>
                      {!selectAllClients ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Clients <span className="text-red-500">*</span>
                          </label>
                          <CustomSelect
                            isMulti
                            loadOptions={loadClientOptions}
                            defaultOptions
                            debounceMs={350}
                            value={selectedClients}
                            onChange={(next) =>
                              setSelectedClients(
                                Array.isArray(next) ? next : [],
                              )
                            }
                            getOptionLabel={getClientOptionLabel}
                            getOptionValue={getClientOptionValue}
                            renderOption={renderCampaignClientOption}
                            placeholder="Search and select clients…"
                            searchPlaceholder="Search clients…"
                            noOptionsMessage="No clients found"
                            isDisabled={saving}
                          />
                        </div>
                      ) : (
                        <p className={CELL_SUB}>
                          All branch clients with valid mobile numbers will be
                          included (duplicates by number resolved on the
                          server).
                        </p>
                      )}
                    </div>
                  ) : null}

                  {audienceType === "group" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Groups <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        isMulti
                        loadOptions={loadGroupOptions}
                        value={selectedGroups}
                        onChange={(next) =>
                          setSelectedGroups(
                            (Array.isArray(next) ? next : []).filter(
                              (g) => getGroupFirmCount(g) > 0,
                            ),
                          )
                        }
                        renderOption={renderGroupOption}
                        isOptionDisabled={(option) =>
                          getGroupFirmCount(option) === 0 ||
                          Boolean(option?.isDisabled)
                        }
                        placeholder="Search and select groups…"
                        searchPlaceholder="Search groups…"
                        noOptionsMessage="No groups found"
                        isDisabled={saving}
                      />
                    </div>
                  ) : null}

                  {audienceType === "task" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service <span className="text-red-500">*</span>
                        </label>
                        <CustomSelect
                          loadOptions={loadServiceOptions}
                          value={selectedService}
                          onChange={setSelectedService}
                          placeholder="Select service…"
                          searchPlaceholder="Search services…"
                          noOptionsMessage="No services found"
                          isClearable={false}
                          isDisabled={saving}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <CustomSelect
                          options={TASK_STATUS_OPTIONS}
                          value={selectedStatus}
                          onChange={(option) =>
                            setSelectedStatus(
                              option || TASK_STATUS_OPTIONS[0],
                            )
                          }
                          isClearable={false}
                          isSearchable={false}
                          isDisabled={saving}
                        />
                      </div>
                    </div>
                  ) : null}

                  {showResolvedPreview ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`${CELL_TITLE} m-0`}>
                          Resolved recipients
                        </p>
                        {resolveLoading ? (
                          <FiLoader className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <span className={CELL_BODY}>
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
                        <p className={`${CELL_SUB} mt-1 m-0`}>
                          {resolveMeta.duplicates_skipped} duplicate number
                          {resolveMeta.duplicates_skipped === 1 ? "" : "s"}{" "}
                          skipped (latest profile kept)
                        </p>
                      ) : null}
                      {resolvedRecipients.length > 0 ? (
                        <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 m-0 p-0 list-none">
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
                            <li className={`${CELL_SUB} font-sans`}>
                              +{resolvedRecipients.length - 40} more
                            </li>
                          ) : null}
                        </ul>
                      ) : !resolveLoading && selectedClients.length > 0 ? (
                        <p className={`${CELL_SUB} mt-2 m-0`}>
                          No valid numbers for this selection.
                        </p>
                      ) : selectedClients.length === 0 ? (
                        <p className={`${CELL_SUB} mt-2 m-0`}>
                          Select clients to preview numbers.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule (optional, IST)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleLocal}
                    onChange={(e) => setScheduleLocal(e.target.value)}
                    disabled={saving}
                    className={FIELD_INPUT}
                  />
                  <p className={`${CELL_SUB} mt-1`}>
                    Leave empty to send as soon as recipients are prepared.
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <p className={`${SECTION_LABEL} mb-3 m-0`}>Preview</p>
                <div className="rounded-xl bg-[#e5ddd5] p-3 flex justify-center lg:sticky lg:top-4">
                  {previewContent ? (
                    <OneChattingTemplatePreview
                      content={previewContent}
                      className="w-[280px] max-w-[280px]"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-500 m-0 px-2 py-8 text-center">
                      Select a template to preview
                    </p>
                  )}
                </div>
                {selectedTemplate ? (
                  <div className="mt-3">
                    <p className={CELL_TITLE}>
                      {selectedTemplate.template_name}
                    </p>
                    <p className={`${CELL_BODY} mt-0.5`}>
                      {selectedTemplate.category || "—"} ·{" "}
                      {(
                        selectedTemplate.template?.language || "en"
                      ).toUpperCase()}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OneChattingCampaignCreate;
