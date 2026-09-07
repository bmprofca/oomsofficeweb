import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FiArrowLeft, FiLoader, FiLock, FiMail, FiSend, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../../../components/header";
import AnimatedCheckbox from "../../../components/AnimatedCheckbox";
import CustomSelect from "../../../components/CustomSelect";
import DateTimePicker from "../../../components/DateTimePicker";
import { useUserPermissions } from "../../../utils/permission-helper";
import API_BASE from "../../../utils/api-controller";
import getHeaders from "../../../utils/get-headers";
import {
  CLIENT_LIST_QUERY_PARAMS,
  createClientListLoadOptions,
  createFetchLoadOptions,
  getClientOptionLabel,
  getClientOptionValue,
  optionByValue,
  renderClientListOption,
} from "../../../utils/customSelectHelpers";
import { emailApi, normalizeList } from "./emailApi";
import { formatEmailTemplateType } from "./emailTemplateTypes";

const contentInset = (isMinimized) => (isMinimized ? "md:pl-20" : "md:pl-[260px]");

const FIELD_INPUT =
  "w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-60 bg-white";
const FIELD_LABEL = "block text-xs font-semibold text-gray-600 mb-1.5 leading-4";
const FIELD_ERROR = "mt-1 text-xs font-medium text-red-600 m-0";
const SECTION_LABEL = "text-[11px] font-bold text-gray-700 uppercase tracking-wide";

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

const SCHEDULE_OPTIONS = [
  { value: "now", label: "Send now" },
  { value: "scheduled", label: "Schedule for later" },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEMO_VARS = {
  name: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  mobile: "9876543210",
  company: "Your Company",
  firm_name: "Acme Traders",
  support_email: "support@example.com",
  date: new Date().toISOString().split("T")[0],
};

const FieldError = ({ message }) => (message ? <p className={FIELD_ERROR}>{message}</p> : null);

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
  if (!force && Array.isArray(cachedGroupOptions)) return cachedGroupOptions;
  if (!force && groupOptionsPromise) return groupOptionsPromise;

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
      <span className={`shrink-0 text-xs tabular-nums ${count === 0 ? "text-gray-400" : "text-gray-500"}`}>
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

const applyDemoVars = (text) =>
  String(text || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => DEMO_VARS[key] || `Sample ${key}`);

const pushRecipient = (list, seen, name, email, variables = {}) => {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean || !emailRegex.test(clean) || seen.has(clean)) return;
  seen.add(clean);
  list.push({
    recipient_name: name || clean,
    recipient_email: clean,
    variable_values_json: {
      name: name || "",
      email: clean,
      date: DEMO_VARS.date,
      ...variables,
    },
  });
};

const fetchAllClientsWithEmail = async () => {
  const headers = getHeaders();
  const collected = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(`${API_BASE}/client/list?page=${page}&limit=100`, { headers });
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    collected.push(...rows);
    hasMore = json?.pagination?.is_last_page === false;
    page += 1;
    if (page > 50) break;
  }
  return collected.filter((c) => emailRegex.test(String(c.email || "").trim()));
};

const EmailBroadcastCreate = () => {
  const { check } = useUserPermissions();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  const [configs, setConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [configId, setConfigId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templatePreview, setTemplatePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [scheduleType, setScheduleType] = useState("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const [audienceType, setAudienceType] = useState("client");
  const [selectAllClients, setSelectAllClients] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(TASK_STATUS_OPTIONS[0]);

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    const load = async () => {
      setLoadingMeta(true);
      try {
        const [cfgRes, tplRes] = await Promise.all([
          emailApi.listConfigs({ page_no: 1, limit: 100 }),
          emailApi.listTemplates({ page_no: 1, limit: 100, status: "active" }),
        ]);
        const nextConfigs = normalizeList(cfgRes?.data);
        const nextTemplates = normalizeList(tplRes?.data).filter((t) => t.status === "active");
        setConfigs(nextConfigs);
        setTemplates(nextTemplates);
        const active = nextConfigs.find((c) => c.status === "active");
        if (active) setConfigId(active.config_id);
        else if (nextConfigs[0]) setConfigId(nextConfigs[0].config_id);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load campaign options");
      } finally {
        setLoadingMeta(false);
      }
    };
    load();
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      setGroupOptions(await fetchGroupOptions());
    } catch {
      toast.error("Failed to load groups");
      setGroupOptions([]);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (audienceType !== "group") return;
    if (groupOptions.length || groupsLoading) return;
    loadGroups();
  }, [audienceType, groupOptions.length, groupsLoading, loadGroups]);

  const configOptions = useMemo(() => {
    const usable = configs.filter((c) => c.status === "active");
    const source = usable.length ? usable : configs;
    return source.map((c) => ({
      value: c.config_id,
      label: `${c.config_name}${c.from_email ? ` · ${c.from_email}` : ""}${c.status === "active" ? "" : " (inactive)"}`,
    }));
  }, [configs]);

  const templateOptions = useMemo(
    () =>
      templates.map((t) => ({
        value: t.template_id,
        label: `${t.template_name}${t.template_type ? ` (${formatEmailTemplateType(t.template_type)})` : ""}`,
      })),
    [templates],
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.template_id === templateId) || null,
    [templates, templateId],
  );

  useEffect(() => {
    if (!templateId) {
      setTemplatePreview(null);
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      setPreviewLoading(true);
      try {
        const res = await emailApi.templateDetails(templateId);
        const data = res?.data || res;
        let subject = applyDemoVars(data?.subject || selectedTemplate?.subject || "");
        let html = applyDemoVars(data?.html_body || selectedTemplate?.html_body || "");
        try {
          const previewRes = await emailApi.previewTemplate({
            subject: data?.subject || selectedTemplate?.subject || "",
            html_body: data?.html_body || selectedTemplate?.html_body || "",
            text_body: data?.text_body || selectedTemplate?.text_body || "",
            variables: DEMO_VARS,
          });
          const rendered = previewRes?.data || previewRes;
          subject = rendered?.subject || subject;
          html = rendered?.htmlBody || rendered?.html || html;
        } catch {
          // Demo vars on the raw template are enough if preview fails.
        }
        if (!cancelled) {
          setTemplatePreview({ subject, html });
        }
      } catch {
        if (!cancelled) {
          setTemplatePreview({
            subject: applyDemoVars(selectedTemplate?.subject || ""),
            html: applyDemoVars(selectedTemplate?.html_body || ""),
          });
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [templateId, selectedTemplate]);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAudienceTypeChange = (id) => {
    setAudienceType(id);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.clients;
      delete next.groups;
      delete next.service;
      delete next.audience;
      return next;
    });
  };

  const resolveRecipients = async () => {
    const list = [];
    const seen = new Set();

    if (audienceType === "client") {
      const clients = selectAllClients ? await fetchAllClientsWithEmail() : selectedClients;
      clients.forEach((client) => {
        pushRecipient(list, seen, client.name || client.username, client.email, {
          username: client.username || "",
          mobile: client.mobile || "",
        });
      });
      return list;
    }

    if (audienceType === "group") {
      const headers = getHeaders();
      for (const group of selectedGroups) {
        const groupId = group?.value ?? group?.group_id;
        const res = await fetch(`${API_BASE}/group/groups/all?group_id=${encodeURIComponent(groupId)}`, { headers });
        const json = await res.json();
        const firms = json?.data?.firms || json?.data?.data?.firms || [];
        firms.forEach((firm) => {
          const client = firm.client || {};
          pushRecipient(list, seen, client.name || firm.firm_name, client.email, {
            username: client.username || "",
            firm_name: firm.firm_name || "",
          });
        });
      }
      return list;
    }

    if (!selectedService?.value) return list;
    const headers = getHeaders();
    let url = `${API_BASE}/task/tasks/filter?service_id=${encodeURIComponent(selectedService.value)}`;
    if (selectedStatus?.value && selectedStatus.value !== "all") {
      url += `&status=${encodeURIComponent(selectedStatus.value)}`;
    }
    const res = await fetch(url, { headers });
    const json = await res.json();
    const tasks = Array.isArray(json?.data?.all_tasks)
      ? json.data.all_tasks
      : Object.values(json?.data?.summary_by_status || {}).flatMap((statusData) => statusData?.tasks || []);
    tasks.forEach((task) => {
      const client = task.client || {};
      pushRecipient(list, seen, client.name || task.firm?.firm_name, client.email, {
        username: client.username || "",
        task_id: task.task_id || "",
        service_name: task.service_name || selectedService?.label || "",
      });
    });
    return list;
  };

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Campaign name is required";
    if (!configId) next.config_id = "Select an SMTP config";
    if (!templateId) next.template_id = "Select a template";
    if (scheduleType === "scheduled" && !scheduledAt) next.scheduled_at = "Pick a date and time";
    if (audienceType === "client" && !selectAllClients && selectedClients.length === 0) {
      next.clients = "Select at least one client, or enable Select all";
    } else if (audienceType === "group" && selectedGroups.length === 0) {
      next.groups = "Select at least one group";
    } else if (audienceType === "task" && !selectedService?.value) {
      next.service = "Select a service";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const recipients = await resolveRecipients();
      if (!recipients.length) {
        toast.error("No recipients with a valid email were found for this audience");
        setSaving(false);
        return;
      }

      const payload = {
        config_id: configId,
        template_id: templateId,
        broadcast_name: name.trim(),
        schedule_type: scheduleType,
        recipients,
      };
      if (scheduleType === "scheduled") payload.scheduled_at = scheduledAt;

      const res = await emailApi.createBroadcast(payload);
      toast.success(res?.message || "Broadcast created");
      const broadcastId = res?.data?.broadcast_id;
      navigate(broadcastId ? `/broadcast/email/details/${broadcastId}` : "/broadcast/email/campaigns");
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Failed to create broadcast");
    } finally {
      setSaving(false);
    }
  };

  if (!check("broadcast_send")) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
        <div className={`pt-16 flex items-center justify-center h-[calc(100vh-4rem)] ${contentInset(isMinimized)}`}>
          <div className="text-center p-6 bg-white rounded-xl border border-gray-200 max-w-sm w-full mx-4">
            <FiLock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-500 mb-1">Access Denied</h3>
            <p className="text-xs text-gray-400">You do not have permission to create campaigns.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

      <div className={`pt-16 transition-all duration-300 ${contentInset(isMinimized)}`}>
        <div className="mx-2 sm:mx-4 md:mx-6 my-3 md:my-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-3 md:px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => navigate("/broadcast/email/campaigns")}
                  className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-white shrink-0"
                  title="Back"
                >
                  <FiArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-gray-800 leading-tight m-0">Create email campaign</h1>
                  <p className="text-xs text-gray-500 m-0">Pick SMTP, template, audience, and send</p>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-4 min-w-0">
                <section className="rounded-xl border border-gray-200 bg-white p-3.5 md:p-4">
                  <p className={`${SECTION_LABEL} mb-3 m-0`}>Campaign</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-3 items-start">
                    <div>
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
                        placeholder="March filing reminder"
                        disabled={saving}
                        className={FIELD_INPUT}
                      />
                      <FieldError message={fieldErrors.name} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>
                        SMTP config <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        options={configOptions}
                        value={optionByValue(configOptions, configId)}
                        onChange={(opt) => {
                          setConfigId(opt?.value || "");
                          clearFieldError("config_id");
                        }}
                        isClearable={false}
                        placeholder={loadingMeta ? "Loading…" : "Select SMTP"}
                        isDisabled={saving || loadingMeta}
                      />
                      <FieldError message={fieldErrors.config_id} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={FIELD_LABEL}>
                        Email template <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        options={templateOptions}
                        value={optionByValue(templateOptions, templateId)}
                        onChange={(opt) => {
                          setTemplateId(opt?.value || "");
                          clearFieldError("template_id");
                        }}
                        isClearable={false}
                        placeholder={loadingMeta ? "Loading…" : "Select template"}
                        isDisabled={saving || loadingMeta}
                      />
                      <FieldError message={fieldErrors.template_id} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>When to send</label>
                      <CustomSelect
                        options={SCHEDULE_OPTIONS}
                        value={optionByValue(SCHEDULE_OPTIONS, scheduleType)}
                        onChange={(opt) => setScheduleType(opt?.value || "now")}
                        isClearable={false}
                        isSearchable={false}
                        isDisabled={saving}
                      />
                    </div>
                    {scheduleType === "scheduled" ? (
                      <div>
                        <label className={FIELD_LABEL}>Schedule date & time</label>
                        <DateTimePicker
                          value={scheduledAt}
                          onChange={(value) => {
                            setScheduledAt(value);
                            clearFieldError("scheduled_at");
                          }}
                          disabled={saving}
                          placeholder="Pick date and time"
                          inputClassName="h-10"
                        />
                        <FieldError message={fieldErrors.scheduled_at} />
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-3.5 md:p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FiUsers className="w-3.5 h-3.5 text-indigo-600" />
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
                              ? "bg-white text-indigo-700 shadow-sm"
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
                              setSelectedClients(Array.isArray(next) ? next : []);
                              clearFieldError("clients");
                            }}
                            getOptionLabel={getClientOptionLabel}
                            getOptionValue={getClientOptionValue}
                            renderOption={renderClientListOption}
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
                            All branch clients with a valid email will be included.
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
                          setSelectedGroups((Array.isArray(next) ? next : []).filter((g) => getGroupFirmCount(g) > 0));
                          clearFieldError("groups");
                        }}
                        renderOption={renderGroupOption}
                        isOptionDisabled={(option) => getGroupFirmCount(option) === 0 || Boolean(option?.isDisabled)}
                        placeholder="Search and select groups…"
                        searchPlaceholder="Search groups…"
                        noOptionsMessage="No groups found"
                        isDisabled={saving || groupsLoading}
                      />
                      {groupsLoading ? <p className="text-xs text-gray-400 mt-1 m-0">Loading groups…</p> : null}
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
                          onChange={(option) => setSelectedStatus(option || TASK_STATUS_OPTIONS[0])}
                          isClearable={false}
                          isSearchable={false}
                          isDisabled={saving}
                        />
                      </div>
                    </div>
                  ) : null}

                  {audienceType === "client" && !selectAllClients && selectedClients.length > 0 ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                      <p className="text-sm font-semibold text-gray-800 m-0">
                        {selectedClients.length} client{selectedClients.length === 1 ? "" : "s"} selected
                      </p>
                      <ul className="mt-2 max-h-32 overflow-y-auto space-y-1 m-0 p-0 list-none">
                        {selectedClients.slice(0, 40).map((row) => (
                          <li key={getClientOptionValue(row)} className="text-xs text-gray-700 truncate">
                            {row.name || row.username}
                            {row.email ? <span className="text-gray-400"> · {row.email}</span> : <span className="text-red-500"> · no email</span>}
                          </li>
                        ))}
                        {selectedClients.length > 40 ? (
                          <li className="text-xs text-gray-400">+{selectedClients.length - 40} more</li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                </section>
              </div>

              <aside className="min-w-0">
                <div className="lg:sticky lg:top-20 space-y-3">
                  <p className={`${SECTION_LABEL} m-0`}>Template preview</p>
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden min-h-[420px] lg:min-h-[560px]">
                    {previewLoading ? (
                      <div className="flex items-center justify-center py-16 text-gray-400">
                        <FiLoader className="w-5 h-5 animate-spin" />
                      </div>
                    ) : templatePreview ? (
                      <div>
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide m-0">Subject</p>
                          <p className="text-sm font-medium text-gray-800 m-0 mt-0.5">{templatePreview.subject || "—"}</p>
                        </div>
                        <div className="p-4 bg-[#f3f4f6] max-h-[640px] overflow-auto">
                          <div
                            className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-700 [&_a]:pointer-events-none [&_a]:cursor-default [&_button]:pointer-events-none [&_area]:pointer-events-none"
                            onClickCapture={(e) => {
                              if (e.target.closest("a, button, area, [href]")) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onAuxClickCapture={(e) => {
                              if (e.target.closest("a, button, area, [href]")) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            dangerouslySetInnerHTML={{ __html: templatePreview.html || "<p>No body</p>" }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 px-4 text-center min-h-[420px] lg:min-h-[560px]">
                        <FiMail className="w-6 h-6 text-gray-300 mb-2" />
                        <p className="text-sm font-medium text-gray-500 m-0">Select a template to preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 md:px-5 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="submit"
                disabled={saving || loadingMeta}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiSend className="w-3.5 h-3.5" />}
                {scheduleType === "now" ? "Send" : "Schedule"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailBroadcastCreate;
