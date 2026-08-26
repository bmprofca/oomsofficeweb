import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiLoader,
  FiLock,
  FiSend,
  FiUsers,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import CustomSelect from "../../../components/CustomSelect";
import useDebounce from "../../../components/useDebounce";
import { useUserPermissions } from "../../../utils/permission-helper";
import {
  CLIENT_LIST_QUERY_PARAMS,
  createClientListLoadOptions,
  createFetchLoadOptions,
  getClientOptionLabel,
  getClientOptionValue,
} from "../../../utils/customSelectHelpers";
import { smsApi, normalizeList } from "../../../services/smsApi";

const FIELD_INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1";
const FIELD_ERROR = "mt-1 text-xs font-medium text-red-600 m-0";
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

/** Client fields that the backend can substitute when sending SMS. */
const CLIENT_VARIABLE_OPTIONS = [
  { value: "{{name}}", label: "{{name}} — Client name" },
  { value: "{{email}}", label: "{{email}} — Client email" },
  { value: "{{mobile}}", label: "{{mobile}} — Client mobile" },
  { value: "{{username}}", label: "{{username}} — Username" },
  { value: "{{balance}}", label: "{{balance}} — Outstanding balance" },
  { value: "{{current_date}}", label: "{{current_date}} — Today's date" },
  { value: "{{payment_link}}", label: "{{payment_link}} — Payment link" },
];

const FieldError = ({ message }) =>
  message ? <p className={FIELD_ERROR}>{message}</p> : null;

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
          ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-200"
          : "bg-white border-gray-300 group-hover:border-blue-400"
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

function getVariableSelectValue(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const matched = CLIENT_VARIABLE_OPTIONS.find((opt) => opt.value === value);
  if (matched) return matched;
  return { value, label: `${value} (static)` };
}

/** Match Fast2SMS / DLT `{#var#}` placeholders → variable_1, variable_2, … */
function deriveVariableKeysFromMessageBody(messageBody) {
  const matches = String(messageBody || "").match(/\{#\s*var\s*#\}/gi) || [];
  return matches.map((_, index) => `variable_${index + 1}`);
}

function resolveTemplateVariableKeys(template) {
  const fromBody = deriveVariableKeysFromMessageBody(template?.message_body);
  if (fromBody.length) return fromBody;
  if (Array.isArray(template?.variable_keys) && template.variable_keys.length) {
    return template.variable_keys.map((k) => String(k).trim()).filter(Boolean);
  }
  return [];
}

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

const Fast2SmsCampaignCreate = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [name, setName] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableInputs, setVariableInputs] = useState({});

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

  const [fieldErrors, setFieldErrors] = useState({});
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolvedRecipients, setResolvedRecipients] = useState([]);
  const [resolveError, setResolveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  const clearFieldError = useCallback((key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await smsApi.listTemplates({
        page_no: 1,
        limit: 100,
        status: "active",
      });
      setTemplates(normalizeList(res?.data));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load templates");
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
        toast.error(error?.response?.data?.message || "Failed to load groups");
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
        label: `${t.name}${t.dlt_message_id ? ` · ${t.dlt_message_id}` : ""}`,
        raw: t,
      })),
    [templates],
  );

  const selectedRaw = selectedTemplate?.raw || null;
  const variableKeys = useMemo(
    () => resolveTemplateVariableKeys(selectedRaw),
    [selectedRaw],
  );

  useEffect(() => {
    const next = {};
    variableKeys.forEach((key) => {
      next[key] = variableInputs[key] || "";
    });
    setVariableInputs(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.value]);

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

  const canAutoResolve = useMemo(() => {
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
    selectedClients.length,
    selectedGroups.length,
    selectedService,
  ]);

  const debouncedAudienceKey = useDebounce(JSON.stringify(audiencePayload), 400);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!canAutoResolve) {
        setResolvedRecipients([]);
        setResolveError("");
        setResolveLoading(false);
        return;
      }

      setResolveLoading(true);
      setResolveError("");
      try {
        const res = await smsApi.resolveCampaignRecipients(
          JSON.parse(debouncedAudienceKey),
        );
        if (cancelled) return;
        setResolvedRecipients(normalizeList(res?.data));
      } catch (error) {
        if (cancelled) return;
        setResolvedRecipients([]);
        setResolveError(
          error?.response?.data?.message || "Failed to resolve recipients",
        );
      } finally {
        if (!cancelled) setResolveLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedAudienceKey, canAutoResolve]);

  const handleAudienceTypeChange = (next) => {
    setAudienceType(next || "client");
    setSelectAllClients(false);
    setSelectedClients([]);
    setSelectedGroups([]);
    setSelectedService(null);
    setSelectedStatus(TASK_STATUS_OPTIONS[0]);
    setResolvedRecipients([]);
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

  const validateAudience = () => {
    const nextErrors = {};
    if (audienceType === "client") {
      if (!selectAllClients && selectedClients.length === 0) {
        nextErrors.clients = "Select at least one client or enable select all";
      }
    } else if (audienceType === "group") {
      if (!selectedGroups.length) {
        nextErrors.groups = "Select at least one group";
      }
    } else if (!selectedService?.value) {
      nextErrors.service = "Select a service";
    }
    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!selectedTemplate?.value) {
      toast.error("Select a template");
      return;
    }
    if (!validateAudience()) {
      toast.error("Please complete the audience selection");
      return;
    }

    const variables_values = variableKeys
      .map((key) => String(variableInputs[key] || "").trim())
      .join("|");

    setSaving(true);
    try {
      const res = await smsApi.createCampaign({
        name: name.trim(),
        template_id: selectedTemplate.value,
        variables_values,
        audience: audiencePayload,
      });
      toast.success(res?.message || "Campaign created");
      const id = res?.data?.campaign_id;
      navigate(
        id
          ? `/broadcast/sms/fast2sms/campaigns/${id}`
          : "/broadcast/sms/fast2sms/campaigns",
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create campaign");
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
          className={`flex h-[calc(100vh-4rem)] items-center justify-center pt-16 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="mx-4 max-w-sm rounded-lg border bg-white p-8 text-center">
            <FiLock className="mx-auto mb-3 h-8 w-8 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500">Access Denied</h3>
          </div>
        </div>
      </div>
    );
  }

  const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";

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
        className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
      >
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
              <h1 className="m-0 text-lg font-bold text-gray-800">
                Create Fast2SMS Campaign
              </h1>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 p-4 md:p-5">
              <div>
                <label className={FIELD_LABEL}>Campaign name</label>
                <input
                  className={FIELD_INPUT}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Campaign name"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className={FIELD_LABEL}>Template</label>
                <CustomSelect
                  value={selectedTemplate}
                  onChange={setSelectedTemplate}
                  options={templateOptions}
                  isLoading={templatesLoading}
                  placeholder="Select template"
                  isDisabled={saving}
                />
                {selectedRaw?.message_body ? (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 whitespace-pre-wrap">
                    {selectedRaw.message_body}
                  </p>
                ) : null}
              </div>

              {variableKeys.length > 0 ? (
                <div>
                  <label className={FIELD_LABEL}>
                    Variables ({variableKeys.length})
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {variableKeys.map((key, index) => {
                      const rawValue = variableInputs[key] || "";
                      const selectValue = getVariableSelectValue(rawValue);
                      const optionsForKey =
                        selectValue &&
                        !CLIENT_VARIABLE_OPTIONS.some(
                          (opt) => opt.value === selectValue.value,
                        )
                          ? [...CLIENT_VARIABLE_OPTIONS, selectValue]
                          : CLIENT_VARIABLE_OPTIONS;
                      return (
                        <div
                          key={key}
                          className="rounded-lg border border-gray-200 bg-slate-50/60 p-3"
                        >
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Variable {index + 1}
                          </label>
                          <CustomSelect
                            value={selectValue}
                            onChange={(opt) =>
                              setVariableInputs((prev) => ({
                                ...prev,
                                [key]: opt?.value || "",
                              }))
                            }
                            options={optionsForKey}
                            placeholder="Select field…"
                            searchPlaceholder="Search…"
                            isClearable
                            isDisabled={saving}
                          />
                          <input
                            className={`${FIELD_INPUT} mt-2`}
                            value={rawValue}
                            onChange={(e) =>
                              setVariableInputs((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder="Or type static value"
                            disabled={saving}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <section className="rounded-xl border border-gray-200 bg-white p-3.5 md:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FiUsers className="w-3.5 h-3.5 text-blue-600" />
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
                            ? "bg-white text-blue-700 shadow-sm"
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
                            All clients with mobile numbers.
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
                      <p className="text-xs text-gray-400 mt-1 m-0">Loading…</p>
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

                {canAutoResolve || resolveLoading || resolveError ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 m-0">
                        Resolved recipients
                      </p>
                      {resolveLoading ? (
                        <FiLoader className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <span className="text-sm font-medium text-blue-800">
                          {resolvedRecipients.length} recipient
                          {resolvedRecipients.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    {resolveError ? (
                      <p className="text-xs text-red-600 mt-2 m-0">
                        {resolveError}
                      </p>
                    ) : null}
                    {resolvedRecipients.length > 0 ? (
                      <ul className="mt-2 max-h-32 overflow-y-auto space-y-1 m-0 p-0 list-none">
                        {resolvedRecipients.slice(0, 40).map((row) => (
                          <li
                            key={`${row.mobile}-${row.profile_id || row.username}`}
                            className="text-xs text-gray-700 font-mono truncate"
                          >
                            {row.mobile}
                            {row.name ? (
                              <span className="text-gray-400 font-sans">
                                {" "}
                                · {row.name}
                              </span>
                            ) : null}
                          </li>
                        ))}
                        {resolvedRecipients.length > 40 ? (
                          <li className="text-xs text-gray-400">
                            +{resolvedRecipients.length - 40} more…
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/broadcast/sms/fast2sms/campaigns")}
                  className="rounded-lg border px-4 py-2 text-sm"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <FiLoader className="h-4 w-4 animate-spin" />
                  ) : (
                    <FiSend className="h-4 w-4" />
                  )}
                  {saving ? "Creating…" : "Create & send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fast2SmsCampaignCreate;
